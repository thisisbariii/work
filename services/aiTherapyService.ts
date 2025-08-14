interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class AITherapyService {
  private static readonly API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  private static readonly API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

  static async sendMessage(userMessage: string): Promise<string> {
    try {
      const systemPrompt = `You are a compassionate, warm AI therapist for a mental health app called "Unfold." Your role is to provide empathetic, supportive responses to users who are sharing their emotions anonymously.

Key guidelines:
- Be warm, empathetic, and non-judgmental
- Use gentle, validating language
- Offer practical coping strategies when appropriate
- Keep responses concise but meaningful (2-3 sentences max)
- Use emojis sparingly but meaningfully
- If you detect crisis language, gently encourage seeking professional help
- Never diagnose or provide medical advice
- Focus on emotional support and validation

Example responses:
"That sounds really heavy. I'm here for you 🫂"
"Your feelings are completely valid. It's okay to feel this way."
"I hear how much pain you're in right now. You're not alone in this."`;

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: GroqResponse = await response.json();
      return data.choices[0]?.message?.content || "I'm here to listen. Could you tell me more about how you're feeling?";
    } catch (error) {
      console.error('Error getting AI response:', error);
      return "I'm having trouble connecting right now, but I want you to know that your feelings matter and you're not alone. 💙";
    }
  }

  static detectCrisis(message: string): boolean {
    const crisisKeywords = [
      'suicide', 'kill myself', 'end it all', 'not worth living',
      'self harm', 'hurt myself', 'want to die', 'suicide',
      'suicidal', 'ending my life'
    ];
    
    const lowerMessage = message.toLowerCase();
    return crisisKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}