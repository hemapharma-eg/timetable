function render() {
  const getActionStats = (() => {
    return (kpi) => {
      console.log('Action stats using matchesProgram');
      return matchesProgram(kpi);
    };
  })(); // Simulated useMemo execution

  const matchesProgram = (val) => {
    return val === 'test';
  };

  const result = getActionStats('test');
  console.log('Result:', result);
}

try {
  render();
} catch(e) {
  console.error('ERROR:', e.message);
}
