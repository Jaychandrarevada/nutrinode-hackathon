🍎 NutriNode — The AI-Native Food Co-Pilot

"Don't just read the label. Understand the impact."

NutriNode is a submission for the Encode Hackathon: Designing AI-Native Consumer Health Experiences. It reimagines how consumers interact with food data—shifting from static "database lookups" to an intelligent, reasoning-driven co-pilot that adapts to your dietary goals in real-time.

🏆 The Challenge: AI-Native Design

Problem: Traditional health apps are form-based. They require users to manually input data, toggle endless filters, and decipher complex chemical names (e.g., "Is Maltodextrin keto?").

NutriNode's AI-Native Solution:
Instead of a tool you use, NutriNode is a Co-Pilot that thinks with you.

Intent-First: No configuration needed. Just point the camera.

Context-Aware: It doesn't just say "Sugar is bad." It says "Since you selected Keto, this sugar is a dealbreaker."

Proactive Reasoning: It suggests questions for you (e.g., "Ask about the hidden sodium") before you even think of them.

✨ Key Features

1. 🧠 Multimodal "AI Lens"

Scan packaging, ingredient lists, or menus using your camera. NutriNode uses Gemini Vision to read the text, infer the product category, and analyze the nutritional profile in a single shot.

2. 🔍 Smart Dietary Lenses

Personalize the AI's reasoning engine. Select a lens—Keto, Vegan, Gluten-Free, Low-FODMAP—and the verdict changes dynamically.

Example: "Oats" = ✅ Healthy (Standard Lens)

Example: "Oats" = ❌ Avoid (Keto Lens)

3. 💬 Proactive Chat Assistant

The chat doesn't just wait for input. Based on the ingredients found, it generates Suggested Questions chips (e.g., "Is this safe for toddlers?") to guide the user's discovery.

4. ⚖️ "Better Choice" Generator

If a product scores low (<70/100), NutriNode proactively searches its knowledge base to suggest a specific, healthier alternative (e.g., "Swap this soda for Sparkling Water with Stevia").

5. 🔊 Hands-Free Mode (TTS)

Using neural Text-to-Speech, NutriNode reads the executive summary aloud—perfect for busy shoppers pushing a cart.

🛠️ Tech Stack

Frontend: React + Vite (Fast, modern SPA)

Styling: Tailwind CSS (Mobile-first, responsive design)

Intelligence: Google Gemini 2.5 Flash (via API)

Vision: For ingredient OCR and scene understanding.

Reasoning: For dietary inference and health scoring.

Audio: For TTS summaries.

Icons: Lucide React

🚀 How to Run Locally

1. Clone the Repository

git clone [https://github.com/YOUR_USERNAME/nutrinode-hackathon.git](https://github.com/YOUR_USERNAME/nutrinode-hackathon.git)
cd nutrinode


2. Install Dependencies

npm install


3. Configure API Key

Get your free API key from Google AI Studio.

Create a .env file in the root directory:

VITE_GEMINI_API_KEY=your_actual_api_key_here


4. Run the Development Server

npm run dev


Open http://localhost:5173 to see the app.

🧩 System Architecture

graph TD
    A[User Input (Camera/Text)] --> B{Intent Inference}
    B -->|Image| C[Gemini Vision]
    B -->|Text| D[Gemini LLM]
    C & D --> E[Context Engine]
    E -->|Apply Diet Profile| F[Reasoning Core]
    F --> G[Structured JSON Verdict]
    G --> H[UI Rendering]
    H --> I[Interactive Features]
    I --> J[Chat / TTS / Alternatives]


📸 Screenshots

Idle State

Analysis Result

Dietary Lens (Keto)

(Place Screenshot Here)

(Place Screenshot Here)

(Place Screenshot Here)

🔮 Future Roadmap

Personalized Health Graph: Connect to Apple Health/Google Fit to adjust scores based on daily activity.

AR Overlay: Live augmented reality overlay on supermarket shelves.

Allergen Alert: Hard-coded "Red Alert" mode for anaphylactic triggers.

Built with ❤️ for the Encode Hackathon.
