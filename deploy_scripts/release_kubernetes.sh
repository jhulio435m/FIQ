#!/usr/bin/env bash
# Application release on an already provisioned environment; schema rollback is forward-only.
set -euo pipefail

environment="${1:?staging or production}"
backend_image="${2:?backend digest required}"
frontend_image="${3:?frontend digest required}"
public_url="${4:?public HTTPS URL required}"
case "$environment" in
  staging) namespace=fiq-staging ;;
  production) namespace=fiq-prod ;;
  *) echo 'Invalid environment' >&2; exit 2 ;;
esac
for release_image in "$backend_image" "$frontend_image"; do
  [[ "$release_image" =~ ^ghcr\.io/[a-z0-9_./-]+@sha256:[a-f0-9]{64}$ ]] || {
    echo 'Release requires immutable GHCR digests' >&2; exit 2;
  }
done
[[ "$public_url" =~ ^https://[a-zA-Z0-9.-]+(:[0-9]+)?$ ]] || {
  echo 'An HTTPS origin without credentials or path is required' >&2; exit 2;
}
for dependency in kubectl python3 curl; do command -v "$dependency" >/dev/null; done
kubectl -n "$namespace" get secret fiq-secrets >/dev/null
previous_backend="$(kubectl -n "$namespace" get deployment backend -o 'jsonpath={.spec.template.spec.containers[?(@.name=="backend")].image}')"
previous_frontend="$(kubectl -n "$namespace" get deployment frontend -o 'jsonpath={.spec.template.spec.containers[?(@.name=="frontend")].image}')"
[[ -n "$previous_backend" && -n "$previous_frontend" ]]

release_id="$(date -u +%s)-${RANDOM}"
job_name="fiq-migrate-${release_id}"
app_changed=false
rollback() {
  local code=$?
  trap - ERR
  if [[ "$app_changed" == true ]]; then
    echo 'Release failed; restoring previous application images. Schema is retained.' >&2
    kubectl -n "$namespace" set image deployment/backend "backend=$previous_backend" || true
    kubectl -n "$namespace" set image deployment/frontend "frontend=$previous_frontend" || true
    kubectl -n "$namespace" rollout status deployment/backend --timeout=300s || true
    kubectl -n "$namespace" rollout status deployment/frontend --timeout=300s || true
  fi
  echo "Inspect migration job ${job_name} and deployment events in ${namespace}." >&2
  exit "$code"
}
trap rollback ERR

# Reuse the deployment's network, service account, secrets, imagePullSecrets and placement.
kubectl -n "$namespace" get deployment backend -o json |
  python3 -c '
import json, sys
image, job, namespace = sys.argv[1:]
template = json.load(sys.stdin)["spec"]["template"]
template["metadata"] = {"labels": {"app.kubernetes.io/name": "fiq-migrate"}}
template["spec"]["restartPolicy"] = "Never"
container = next(c for c in template["spec"]["containers"] if c["name"] == "backend")
container.update(image=image, command=["python", "-m", "app.core.migrate"])
for key in ("args", "ports", "readinessProbe", "livenessProbe", "startupProbe"):
    container.pop(key, None)
template["spec"]["containers"] = [container]
print(json.dumps({"apiVersion": "batch/v1", "kind": "Job", "metadata": {"name": job, "namespace": namespace},
    "spec": {"backoffLimit": 0, "activeDeadlineSeconds": 600, "ttlSecondsAfterFinished": 86400, "template": template}}))
' "$backend_image" "$job_name" "$namespace" |
  kubectl create -f -
kubectl -n "$namespace" wait --for=condition=complete "job/$job_name" --timeout=600s

app_changed=true
kubectl -n "$namespace" set image deployment/backend "backend=$backend_image"
kubectl -n "$namespace" set image deployment/frontend "frontend=$frontend_image"
kubectl -n "$namespace" rollout status deployment/backend --timeout=300s
kubectl -n "$namespace" rollout status deployment/frontend --timeout=300s
curl --fail --silent --show-error --max-time 20 "$public_url/api/health" | python3 -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("status") == "ok" else 1)'
curl --fail --silent --show-error --max-time 20 "$public_url/api/resources/types" | python3 -c 'import json,sys; sys.exit(0 if isinstance(json.load(sys.stdin), list) else 1)'
curl --fail --silent --show-error --max-time 20 "$public_url/biblioteca" >/dev/null
printf 'Release verified: %s\nBackend: %s\nFrontend: %s\n' "$environment" "$backend_image" "$frontend_image"
