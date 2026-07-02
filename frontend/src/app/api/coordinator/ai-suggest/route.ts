import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { boothId, houseNo } = body;

    if (!boothId || !houseNo) {
      return NextResponse.json({ error: 'Booth ID and House Number are required' }, { status: 400 });
    }

    const dbPath = path.join(process.cwd(), 'prisma/db.json');
    const voterPath = path.join(process.cwd(), 'prisma/voter.json');

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'Database not found' }, { status: 500 });
    }

    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    const booth = db.booth.find((b: any) => b.id === Number(boothId));
    if (!booth) {
      return NextResponse.json({ error: 'Booth not found' }, { status: 404 });
    }

    const activeVolunteers = db.volunteer.filter(
      (v: any) => v.assignedBoothId === booth.id && v.status === 'APPROVED'
    );

    if (activeVolunteers.length === 0) {
      return NextResponse.json({ error: 'No available volunteers for this booth' }, { status: 400 });
    }

    // Load voter data and find residents of the target house
    let demographics = 'Unknown demographics';
    let section = 'Unknown Location';

    if (fs.existsSync(voterPath)) {
      const votersData = JSON.parse(fs.readFileSync(voterPath, 'utf-8'));
      const houseVoters = votersData.filter(
        (v: any) => v.part_number === booth.partNumber && v.house_no?.toString().trim() === houseNo.toString()
      );

      if (houseVoters.length > 0) {
        section = houseVoters[0].section || houseVoters[0].part_number || 'Unknown Location';
        demographics = houseVoters.map((v: any) =>
          `- ${v.first_name || v.name || 'Unknown'} (Age: ${v.age || 'Unknown'}, Gender: ${v.gender || 'Unknown'}, Relation: ${v.relation_name || 'N/A'})`
        ).join('\n');
      }
    }

    const volunteerList = activeVolunteers.map((v: any) =>
      `[ID: ${v.id}] Name: ${v.name}`
    ).join('\n');

    // Build the rich prompt (same as original boothman)
    const prompt = `You are an expert political campaign manager in India assigning volunteers for a door-to-door outreach campaign.
Your goal is to pick the single BEST volunteer to visit a specific household to build maximum rapport and trust.

Household Location: ${section}
Household Demographics (Voters living here):
${demographics}

Available Volunteers:
${volunteerList}

Strategy Guidelines to consider when making your choice:
1. Gender Matching: If the household is predominantly female, strongly prefer a female volunteer.
2. Age Matching: If the household has elderly voters, a mature-sounding volunteer might be good.
3. Community/Surname Rapport: Look closely at the LAST NAMES (surnames) of the household members and volunteers. WARNING: Do not confuse first names with last names! For example, "Manish Mishra" and "Manish Singh" do NOT share a surname. Only prioritize a volunteer if their actual LAST NAME matches the household's last name or community.

Analyze the household makeup and the available volunteers based on the above guidelines.
Choose exactly ONE volunteer ID from the list above that is the absolute best fit. Provide a clear 1 to 2-sentence reasoning for your choice, explicitly mentioning your strategy (e.g., matching gender, age, or community background). Ensure your reasoning is factually accurate based on the provided text.

Respond ONLY in this exact JSON format, nothing else:
{
  "volunteerId": number,
  "reasoning": "string"
}`;

    const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';
    const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

    const ollamaResponse = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: prompt,
        format: 'json',
        stream: false
      })
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API error: ${ollamaResponse.statusText}`);
    }

    const ollamaData = await ollamaResponse.json();
    let result;
    try {
      result = JSON.parse(ollamaData.response);
    } catch {
      // Fallback regex parse if model doesn't respect JSON format
      const idMatch = ollamaData.response.match(/"volunteerId":\s*(\d+)/);
      const reasoningMatch = ollamaData.response.match(/"reasoning":\s*"([^"]+)"/);
      if (idMatch) {
        result = {
          volunteerId: parseInt(idMatch[1]),
          reasoning: reasoningMatch ? reasoningMatch[1] : 'Selected by AI.'
        };
      } else {
        throw new Error('Could not parse AI response');
      }
    }

    // Validate AI returned a real volunteer ID
    const validVol = activeVolunteers.find((v: any) => v.id === result.volunteerId);
    if (!validVol) {
      result.volunteerId = activeVolunteers[0].id;
      result.reasoning = 'AI suggested an invalid ID. Falling back to first available volunteer.';
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('AI Suggest error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate AI suggestion. Ensure Ollama is running.' },
      { status: 500 }
    );
  }
}
