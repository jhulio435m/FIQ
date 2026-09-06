"""Exercise release ordering and rollback with a fake cluster, never a live kubeconfig."""
import json
import os
from pathlib import Path
import subprocess

import pytest

SCRIPT = Path(__file__).resolve().parents[2] / "deploy_scripts/release_kubernetes.sh"
FAKE_KUBECTL = '''#!/usr/bin/env python3
import json,os,sys
from pathlib import Path
args=sys.argv[1:]
with open(os.environ['RELEASE_LOG'],'a') as f: f.write(' '.join(args)+'\\n')
if 'get' in args and 'deployment' in args:
    if args[-1]=='json':
        print(json.dumps({'spec':{'template':{'metadata':{'labels':{'app.kubernetes.io/name':'backend'}},'spec':{
          'containers':[{'name':'backend','image':'old-backend','envFrom':[{'secretRef':{'name':'fiq-secrets'}}],
          'readinessProbe':{'httpGet':{'path':'/health','port':8000}}}], 'imagePullSecrets':[{'name':'ghcr'}]}}}}))
    else: print('old-backend' if 'backend' in args else 'old-frontend')
if 'create' in args:
    Path(os.environ['RELEASE_JOB']).write_text(sys.stdin.read())
if 'wait' in args and os.environ.get('FAIL_AT')=='migration': sys.exit(1)
if 'rollout' in args and os.environ.get('FAIL_AT')=='rollout':
    marker=Path(os.environ['RELEASE_LOG']+'.failed')
    if not marker.exists(): marker.touch(); sys.exit(1)
'''
FAKE_CURL = '''#!/usr/bin/env python3
import os,sys
if os.environ.get('FAIL_AT')=='smoke': sys.exit(22)
print('{"status":"ok"}' if sys.argv[-1].endswith('/health') else '[]')
'''


@pytest.mark.parametrize("failure", ["", "migration", "rollout", "smoke"])
def test_release_gates_and_rolls_back(tmp_path, failure):
    bin_path = tmp_path / "bin"
    bin_path.mkdir()
    for name, source in [("kubectl", FAKE_KUBECTL), ("curl", FAKE_CURL)]:
        target = bin_path / name
        target.write_text(source)
        target.chmod(0o700)
    log = tmp_path / "calls"
    job = tmp_path / "job.json"
    result = subprocess.run(["bash", str(SCRIPT), "staging",
        "ghcr.io/jhulio435m/fiq-backend@sha256:" + "a" * 64,
        "ghcr.io/jhulio435m/fiq-frontend@sha256:" + "b" * 64,
        "https://fiq.invalid"], env={**os.environ, "PATH": str(bin_path) + os.pathsep + os.environ["PATH"],
        "RELEASE_LOG": str(log), "RELEASE_JOB": str(job), "FAIL_AT": failure}, capture_output=True, text=True)
    assert (result.returncode == 0) == (failure == ""), result.stderr
    calls = log.read_text()
    assert calls.index("create -f -") < calls.index("wait --for=condition=complete")
    template = json.loads(job.read_text())["spec"]["template"]
    assert template["metadata"]["labels"]["app.kubernetes.io/name"] != "backend"
    assert template["spec"]["imagePullSecrets"] == [{"name": "ghcr"}]
    container = template["spec"]["containers"][0]
    assert container["command"] == ["python", "-m", "app.core.migrate"]
    assert "readinessProbe" not in container
    if failure == "migration":
        assert "set image" not in calls
    elif failure:
        assert "backend=old-backend" in calls
        assert "frontend=old-frontend" in calls
    else:
        assert "old-backend" not in calls


def test_mutable_images_are_rejected_before_cluster_access():
    result = subprocess.run(["bash", str(SCRIPT), "staging", "ghcr.io/example/backend:latest",
                             "ghcr.io/example/frontend:latest", "https://fiq.invalid"], capture_output=True)
    assert result.returncode == 2
