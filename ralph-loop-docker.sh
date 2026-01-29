# # Step 1: Start container and login (you'll see Claude Code UI)
# docker run -it \
#   -v $(pwd):/workspace \
#   --name claude-loop \
#   docker/sandbox-templates:claude-code \
#   claude

# This will show Claude Code's interactive UI
# Type: /login
# Follow the login process
# Then type: exit (or Ctrl+D)
# 
# Step 2: Run commands in the existing container
while :; do
  echo "=== Starting iteration ==="
  
  # Use exec to run commands in the EXISTING container
  docker start claude-loop 2>/dev/null || true
  docker exec -w /workspace claude-loop claude --dangerously-skip-permissions "$(cat PROMPT.md)" 2>&1 | tee .log
  
  grep -qi "done" .log || break
  sleep 2
done
# Cleanup when done
docker stop claude-loop

# # 
# # 
# # try #6 loops but doesn't automatically because it shows the ui
# while :; do
#   echo "=== Starting iteration ==="
  
#   docker start claude-loop 2>/dev/null || true
#   docker exec -it -w /workspace claude-loop claude --dangerously-skip-permissions "$(cat PROMPT.md)" | tee .log
  
#   grep -qi "done" .log || break
#   sleep 2
# done
# # 