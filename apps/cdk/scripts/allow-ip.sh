#!/usr/bin/env bash
# Changes the pre-event IP allowlist without a deploy (takes effect within seconds).
#
#   scripts/allow-ip.sh            # allow only this machine's current public IPv4
#   scripts/allow-ip.sh 203.0.113.7,198.51.100.0/24
#   scripts/allow-ip.sh open       # allow everyone (event day)
#   scripts/allow-ip.sh show       # print the current list
#
# Needs AWS CLI v2 and credentials for the account. STACK / REGION override the defaults.
set -euo pipefail

STACK="${STACK:-CdkLoverStack}"
REGION="${REGION:-us-west-2}"

arn=$(aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?starts_with(OutputKey, 'IpAllowlistKeyValueStoreArn')].OutputValue | [0]" --output text)
if [[ -z "$arn" || "$arn" == "None" ]]; then
  echo "No IP allowlist in $STACK ($REGION). Was it deployed with ipRestriction=false?" >&2
  exit 1
fi

kvs() { aws cloudfront-keyvaluestore --region us-east-1 "$@"; }

if [[ "${1:-}" == "show" ]]; then
  kvs get-key --kvs-arn "$arn" --key allowed --query Value --output text
  exit 0
fi

case "${1:-}" in
  "") value=$(curl -fsS https://checkip.amazonaws.com | tr -d '[:space:]') ;;
  open) value="0.0.0.0/0" ;;
  *) value="$1" ;;
esac

etag=$(kvs describe-key-value-store --kvs-arn "$arn" --query ETag --output text)
kvs put-key --kvs-arn "$arn" --key allowed --value "$value" --if-match "$etag" >/dev/null
echo "allowed = $value"
