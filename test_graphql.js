async function test() {
    const query = `
    query GetPaymentData($month: String, $startDate: String!, $endDate: String!) {
      getPaymentStats(month: $month, startDate: $startDate, endDate: $endDate) {
        totalRecetteCaisse
        totalRecetteNette
        totalExpenses
      }
    }
  `;

    try {
        const res = await fetch('http://localhost:3000/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                variables: {
                    month: '2026-01',
                    startDate: '2026-01-01',
                    endDate: '2026-01-31'
                }
            })
        });
        const json = await res.json();
        console.log('Result:', JSON.stringify(json.data.getPaymentStats, null, 2));
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

test();
