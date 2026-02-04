import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { message, context, history } = await req.json();

        const apiKey = process.env.NVIDIA_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "NVIDIA_API_KEY missing" }, { status: 500 });
        }

        const apiUrl = "https://integrate.api.nvidia.com/v1/chat/completions";

        // Extract data from context
        const stats = context?.stats || [];
        const supplierTotals = context?.supplierTotals || {};
        const unpaidTotal = context?.unpaidTotal || 0;
        const paidTotal = context?.paidTotal || 0;
        const bankDepositsTotal = context?.bankDepositsTotal || 0;
        const salariesTotal = context?.salariesTotal || 0;
        const paidUsers = context?.paidUsers || [];
        const paymentStats = context?.paymentStats || {};
        const suppliers = context?.suppliers || [];
        const employees = context?.employees || [];

        // Calculate totals from daily stats
        let totalRecette = 0;
        let totalDepenses = 0;
        let totalNet = 0;
        let totalTPE = 0;
        let totalCheque = 0;
        let totalEspeces = 0;
        let totalTickets = 0;

        stats.forEach((d: any) => {
            totalRecette += d.recette || 0;
            totalDepenses += d.depenses || 0;
            totalNet += d.net || 0;
            totalTPE += d.tpe || 0;
            totalCheque += d.cheque || 0;
            totalEspeces += d.especes || 0;
            totalTickets += d.tickets || 0;
        });

        // Find latest day with data
        const validDays = stats.filter((d: any) => d.recette > 0 || d.depenses > 0);
        const latestDay = validDays.length > 0
            ? validDays.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
            : null;

        // Build supplier list (top 10)
        const supplierList = Object.entries(supplierTotals)
            .map(([name, data]: [string, any]) => `${name}: ${data.total.toFixed(2)} DT (Payé: ${data.paid.toFixed(2)}, Impayé: ${data.unpaid.toFixed(2)})`)
            .slice(0, 10)
            .join('\n');

        // Build salary list
        const salaryList = paidUsers
            .slice(0, 10)
            .map((u: any) => `${u.username}: ${u.amount.toFixed(2)} DT`)
            .join('\n');

        const systemPrompt = `Tu es l'assistant Business Bey. RÈGLES STRICTES:

1. Réponds en français, TRÈS COURT (1-3 phrases max)
2. Donne UNIQUEMENT les chiffres demandés, pas d'explications
3. Utilise les données EXACTES ci-dessous, ne calcule rien toi-même
4. Tu ne peux PAS modifier les données

=== CHIFFRES EXACTS (utilise ces valeurs) ===

CHIFFRE D'AFFAIRE TOTAL: ${totalRecette.toFixed(2)} DT
TOTAL DÉPENSES: ${totalDepenses.toFixed(2)} DT
RESTE/BÉNÉFICE NET: ${totalNet.toFixed(2)} DT

DÉTAILS:
- TPE: ${totalTPE.toFixed(2)} DT
- Chèques: ${totalCheque.toFixed(2)} DT
- Espèces: ${totalEspeces.toFixed(2)} DT
- Tickets Restaurant: ${totalTickets.toFixed(2)} DT

FACTURES:
- Non Payées: ${unpaidTotal.toFixed(2)} DT
- Payées: ${paidTotal.toFixed(2)} DT

AUTRES:
- Virements Bancaires: ${bankDepositsTotal.toFixed(2)} DT
- Salaires: ${salariesTotal.toFixed(2)} DT

${latestDay ? `DERNIER JOUR (${latestDay.date}):
- Recette: ${latestDay.recette.toFixed(2)} DT
- Dépenses: ${latestDay.depenses.toFixed(2)} DT
- Net: ${latestDay.net.toFixed(2)} DT` : ''}

FOURNISSEURS:
${supplierList || 'Aucun'}

SALAIRES:
${salaryList || 'Aucun'}

=== EXEMPLES DE RÉPONSES CORRECTES ===

Q: "Chiffre d'affaire total?"
R: "Le chiffre d'affaire total est de ${totalRecette.toFixed(2)} DT."

Q: "Total dépenses?"
R: "Le total des dépenses est de ${totalDepenses.toFixed(2)} DT."

Q: "Reste/Bénéfice?"
R: "Le reste net est de ${totalNet.toFixed(2)} DT."

Q: "Factures non payées?"
R: "Total non payé: ${unpaidTotal.toFixed(2)} DT."

RÉPONDS COURT ET DIRECT.`;

        const messagesPayload = [
            { role: "system", content: systemPrompt }
        ];

        // Add history (only last 4)
        if (history && Array.isArray(history)) {
            history.slice(-4).forEach((msg: any) => {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    messagesPayload.push({ role: msg.role, content: msg.content });
                }
            });
        }

        messagesPayload.push({ role: "user", content: message });

        console.log("AI Request:", message);
        console.log("Totals - Recette:", totalRecette.toFixed(2), "| Dépenses:", totalDepenses.toFixed(2), "| Net:", totalNet.toFixed(2));

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "nvidia/llama-3.3-nemotron-super-49b-v1",
                messages: messagesPayload,
                temperature: 0.1,  // Very low for precise answers
                top_p: 0.9,
                max_tokens: 150,   // Short responses
                stream: false
            })
        });

        if (!response.ok) {
            const fallbackResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "meta/llama-3.1-8b-instruct",
                    messages: messagesPayload,
                    temperature: 0.1,
                    max_tokens: 150,
                    stream: false
                })
            });

            if (!fallbackResponse.ok) {
                throw new Error(`API Error`);
            }

            const fallbackData = await fallbackResponse.json();
            return NextResponse.json({ result: fallbackData.choices[0].message.content });
        }

        const data = await response.json();

        if (!data.choices?.[0]?.message?.content) {
            throw new Error("Invalid response");
        }

        let content = data.choices[0].message.content;
        content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        console.log("Response:", content);

        return NextResponse.json({ result: content });

    } catch (error: any) {
        console.error("AI Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
