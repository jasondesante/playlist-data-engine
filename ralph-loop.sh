while :; do 
  # Runs claude and saves a copy of the output to .log while still showing it 
  claude --dangerously-skip-permissions "$(cat PROMPT.md)" | tee .log
  
  # Logic: If 'done' is NOT found in the log, break the loop
  grep -q "done" .log || break
done