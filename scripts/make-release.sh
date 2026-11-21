#!/usr/bin/env bash
# Локальный релиз плагина без GitHub Actions.
# 1) собирает main.js (npm install + npm run build)
# 2) коммитит + пушит ветку dev-matebook
# 3) создаёт тег + GitHub release с артефактами (main.js, manifest.json, styles.css)
#
# Аргументы:
#   $1 — версия (без v), напр. 0.8.1
#   $2 — (опц) сообщение релиза
#
# Требует: gh (авторизован), git, node/npm в PATH.
set -euo pipefail

VERSION="${1:-}"
NOTE="${2:-Release $VERSION}"

if [[ -z "$VERSION" ]]; then
  echo "Usage: $0 <version> [release-note]" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

# 1. Сборка
echo "== npm install =="
npm install
echo "== build =="
npm run build
if [[ ! -f main.js ]]; then
  echo "main.js не собрался" >&2
  exit 1
fi

# 2. Обновить версию в manifest.json
echo "== bump manifest version -> $VERSION =="
python3 - "$VERSION" <<'PY'
import sys, json
v = sys.argv[1]
p = "manifest.json"
d = json.load(open(p, encoding="utf-8"))
d["version"] = v
json.dump(d, open(p, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
open(p, "a", encoding="utf-8").write("\n")
PY

# 3. Коммит + пуш
echo "== git commit + push dev-matebook =="
git add -A
git commit -q -m "release: v$VERSION" || echo "(nothing to commit)"
GITHUB_TOKEN="${GITHUB_TOKEN:-$(grep GITHUB_TOKEN /root/.hermes/.env | head -1 | cut -d= -f2)}"
git push "https://${GITHUB_TOKEN}@github.com/mamadaevv/card-columns.git" dev-matebook

# 4. Тег + релиз
TAG="$VERSION"
echo "== tag + release $TAG =="
gh release create "$TAG" \
  --title "$TAG" \
  --notes "$NOTE" \
  main.js manifest.json styles.css

echo "== done: https://github.com/mamadaevv/card-columns/releases/tag/$TAG =="
