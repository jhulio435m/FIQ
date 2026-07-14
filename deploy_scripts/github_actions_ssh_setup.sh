#!/usr/bin/env bash
set -euo pipefail

ssh_dir="${HOME}/.ssh"
mkdir -p "${ssh_dir}"
chmod 700 "${ssh_dir}"

if [[ -z "${DEPLOY_SSH_KEY:-}" ]]; then
  echo "DEPLOY_SSH_KEY is required" >&2
  exit 2
fi

printf '%s\n' "${DEPLOY_SSH_KEY}" > "${ssh_dir}/fiq_deploy_key"
chmod 600 "${ssh_dir}/fiq_deploy_key"

if [[ -n "${DEPLOY_KNOWN_HOSTS:-}" ]]; then
  printf '%s\n' "${DEPLOY_KNOWN_HOSTS}" > "${ssh_dir}/known_hosts"
  chmod 644 "${ssh_dir}/known_hosts"
fi

cat > "${ssh_dir}/config" <<EOF
Host fiq-deploy-target
  HostName ${DEPLOY_HOST}
  User ${DEPLOY_USER}
  IdentityFile ${ssh_dir}/fiq_deploy_key
  IdentitiesOnly yes
  StrictHostKeyChecking yes
EOF
chmod 600 "${ssh_dir}/config"
