import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { text, prompt, mode = 'response' } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Email text is required' }, { status: 400 })
    }

    if (mode === 'response' && !prompt) {
      return NextResponse.json({ error: 'Prompt is required for response mode' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system" as const, 
          content: mode === 'response' 
            ? "You are a professional email writer for the user. Write clear, concise, and professional email responses. Only provide the body of the email - do not include subject lines, greetings (like 'Dear X'), or signatures/closing lines (like 'Best regards'). Just write the main content of the email."
            : "You are a professional email writer. Rewrite emails to be clear, concise, and professional. Only provide the body of the email - do not include subject lines, greetings (like 'Dear X'), or signatures/closing lines (like 'Best regards'). Just write the main content of the email." 
        },
        ...(mode === 'response' ? [
          { 
            role: "user" as const, 
            content: `The user has provided this context for how to answer: "${prompt}"\n\nUsing that prompt, write a response to this email (body only):\n\n${text}`
          }
        ] : [
          {
            role: "user" as const,
            content: `Please rewrite this email to be more professional and effective (provide body only):\n\n${text}`
          }
        ])
      ],
      max_tokens: 1500,
    })

    const content = completion.choices[0].message.content

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Error generating email:', error)
    return NextResponse.json({ error: 'An error occurred while generating the email' }, { status: 500 })
  }
} 