#!/usr/bin/env bash
# safe_commit.sh "<commit message>" file1 [file2 ...]
#
# Commits the given files and pushes, RETRYING on concurrent-push races so a
# collision with another agent (or a human pushing) never fails the run or
# loses the agent's work. On an unresolvable conflict it warns and defers to
# the next scheduled run rather than erroring out.
#
# Env: GIT_NAME / GIT_EMAIL for the commit identity (optional).
set -u

msg="${1:?commit message required}"; shift
files=("$@")

if ! git status --porcelain "${files[@]}" | grep -q .; then
  echo "No changes to commit."
  exit 0
fi

git config user.name "${GIT_NAME:-mdct-bot}"
git config user.email "${GIT_EMAIL:-mdct-bot@users.noreply.github.com}"
git add "${files[@]}"
git commit -m "$msg" || { echo "Nothing staged after add."; exit 0; }

for i in 1 2 3 4 5; do
  if git pull --rebase --autostash origin main && git push; then
    echo "Pushed (attempt $i)."
    exit 0
  fi
  echo "Push race/conflict — retry $i/5."
  git rebase --abort 2>/dev/null || true
  sleep $(( (RANDOM % 6) + 3 ))
done

echo "::warning::Could not push after 5 retries; the next scheduled run will re-file this work."
exit 0
