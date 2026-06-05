#!/usr/bin/env sh
set -eu

TARGET_NODE_MAJOR=22
TARGET_NODE_VERSION="${TARGET_NODE_VERSION:-22}"
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
BREW_JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"

if [ -d "$BREW_JAVA_HOME" ]; then
  export JAVA_HOME="${JAVA_HOME:-$BREW_JAVA_HOME}"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm use "$TARGET_NODE_VERSION" >/dev/null
fi

CURRENT_NODE_MAJOR="$(node -e 'console.log(process.versions.node.split(".")[0])')"

if [ "$CURRENT_NODE_MAJOR" != "$TARGET_NODE_MAJOR" ]; then
  echo "Node $TARGET_NODE_MAJOR is required. Run: nvm install $TARGET_NODE_VERSION && nvm use" >&2
  exit 1
fi

exec "$@"
