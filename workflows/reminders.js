- name: Test imports
  env:
    PYTHONPATH: "${{ github.workspace }}"
  run: |
    echo "Testing module imports..."
    python -c "import bigquery.cache; print('BigQuery Cache OK')"
    python -c "import functions.payment; print('Payment Functions OK')"
    python -c "import functions.snooze; print('Snooze Functions OK')"
    python -c "import functions.security; print('Security Functions OK')"
    python -c "import functions.error_handling; print('Error Handling OK')"
    python -c "import bigquery.microbatching; print('Microbatching OK')"
    echo "All imports successful!"