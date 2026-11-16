#!/usr/bin/env bash
# Divide un manifiesto renderizado por kustomize en tres fases de aplicación:
#   1-infra.yaml   todo lo que no es Deployment ni Job (namespace, config, services, políticas…)
#   2-migrate.yaml Jobs (migraciones), que deben terminar antes del rollout
#   3-apps.yaml    Deployments
# Uso: split_manifests.sh <all.yaml> <directorio-salida>
set -euo pipefail

input="$1"
outdir="$2"
mkdir -p "${outdir}"
: > "${outdir}/1-infra.yaml"
: > "${outdir}/2-migrate.yaml"
: > "${outdir}/3-apps.yaml"

awk -v out="${outdir}" '
  function flush() {
    if (doc == "") return
    target = out "/1-infra.yaml"
    if (kind == "Deployment") target = out "/3-apps.yaml"
    else if (kind == "Job") target = out "/2-migrate.yaml"
    printf "---\n%s", doc >> target
    doc = ""; kind = ""
  }
  /^---[[:space:]]*$/ { flush(); next }
  /^kind:[[:space:]]/ { kind = $2 }
  { doc = doc $0 "\n" }
  END { flush() }
' "${input}"

for f in 1-infra 2-migrate 3-apps; do
  count="$(grep -c '^kind:' "${outdir}/${f}.yaml" || true)"
  echo "${f}: ${count} recursos"
done
