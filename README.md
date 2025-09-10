# AI Answers Forms

[![Version](https://img.shields.io/badge/Version-2.0.0-blue)](https://github.com/priyanshussgupta/google_form_answer_ai)
[![License](https://img.shields.io/github/license/priyanshussgupta/google_form_answer_ai)](https://github.com/priyanshussgupta/google_form_answer_ai/blob/main/LICENSE)

---

## ✨ About

This Chrome extension automatically answers questions in Google Forms quizzes. It leverages powerful large language models (LLMs) to provide solutions for both text and image-based questions, saving you time and effort. Simply activate the extension and watch it fill out the form for you!

[![Demo Video Thumbnail](https://img.youtube.com/vi/CrCfnl0OpT8/0.jpg)](https://www.youtube.com/watch?v=CrCfnl0OpT8)

---

## 🚀 Features

* **Text & Image Support**: Get answers for both text-based questions and those with images.
* **Multi-Provider AI**: Easily switch between AI providers like **Gemini**, **OpenRouter**, or **Groq** by updating a single configuration line.
* **Smart Autofill**: The extension intelligently selects the correct options on the form based on the AI's response.
* **Keyboard Shortcuts**: Use quick key combinations to fetch, show, or erase answers.
* **Context Menu Integration**: Access all core functions directly from the right-click menu on any Google Forms page.

---

## ⚙️ How It Works

The extension operates by injecting a content script (`main.js`) into the Google Forms page. This script extracts the quiz questions and options, and then sends them to the configured AI provider's API. The AI's response is then used to auto-select the correct answer. Image questions are handled by first converting the image to a Base64 string and then sending it to a vision-enabled model. All key functions, including fetching, showing, and erasing answers, are triggered by simple background scripts.

---

## 🔑 Configuration

To use this extension, you must set up your API key.

1.  Open the `main.js` file in a text editor.
2.  Find the `API_CONFIG` object at the top of the file.
3.  Set your preferred provider by changing the `CURRENT_PROVIDER` variable.
    ```javascript
    const CURRENT_PROVIDER = 'GEMINI'; // Or 'OPENROUTER', 'GROQ'
    ```
4.  Paste your API key into the corresponding field within the `API_CONFIG` object.

---

## ⌨️ Usage

You can interact with the extension using keyboard shortcuts or the right-click context menu.

| Command | Shortcut (Windows) | Shortcut (macOS) | Description |
| :--- | :--- | :--- | :--- |
| **Get Answers** | `Alt + G` | `Alt + G` | Fetches answers from the AI and fills the form. |
| **Toggle Answers** | `Alt + H` | `Alt + H` | Shows or hides the generated answers. |
| **Erase Answers** | `Ctrl + Shift + 3` | `Command + Shift + 3` | Clears all AI-generated answers from the page. |

---

## ⚠️ Limitations

* **Groq Provider**: The Groq API is text-only and does not support image-based questions.
* **OpenRouter Referer**: When using OpenRouter, an `HTTP-Referer` header is added to your request as a requirement of their service.

---
