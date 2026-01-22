  while :; do
    output=$(docker sandbox run claude "$(cat PROMPT.md)")
    echo "$output" | tee .log
    echo "$output" | grep -q "done" || break
  done
#   while :; do
#     docker sandbox run claude "$(cat PROMPT.md)" | tee .log
#     grep -q "done" .log && continue || break
#   done