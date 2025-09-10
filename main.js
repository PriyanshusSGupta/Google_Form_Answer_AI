// --- START: API Configuration ---
// ❗ CHOOSE YOUR AI PROVIDER HERE
// Change this value to 'GEMINI', 'OPENROUTER', or 'GROQ'
const CURRENT_PROVIDER = 'GROQ';

const API_CONFIG = {
    GEMINI: {
        API_KEY: "YOUR_GEMINI_API_KEY_HERE",
        // Use a model that supports both text and vision
        MODEL: "gemini-1.5-flash-latest",
        getURL: function() { return `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL}:generateContent?key=${this.API_KEY}` }
    },
    OPENROUTER: {
        API_KEY: "", // ❗ PASTE YOUR OPENROUTER API KEY HERE
        URL: "https://openrouter.ai/api/v1/chat/completions",
        // A model that supports both text and vision, often free
        MODEL: "deepseek/deepseek-chat-v3.1:free",
    },
    GROQ: {
        API_KEY: "",
        URL: "https://api.groq.com/openai/v1/chat/completions",
        // A fast text-only model
        MODEL: "llama-3.3-70b-versatile",
    }
};
// --- END: API Configuration ---

const basePrompt = `Analyze the following multiple-choice question. Respond with ONLY the full text of the correct option. Do not include any explanation, introductory text, or formatting. Question: `;

const getTextAnswers = async (question = "", options = [], ind = 0) => {
  try {
    let prompt = `${basePrompt} ${question}  `;
    if (options.length > 0) {
      prompt += `Options are: `;
      options.forEach((opt, i) => {
        prompt += `${i + 1}. ${opt} `;
      });
    }

    let requestBody, apiUrl, headers;
    const providerConfig = API_CONFIG[CURRENT_PROVIDER];

    if (!providerConfig || providerConfig.API_KEY.startsWith("YOUR_")) {
        return `ERROR: Please set your ${CURRENT_PROVIDER} API key in the extension's main.js file.`;
    }

    switch (CURRENT_PROVIDER) {
        case 'GEMINI':
            apiUrl = providerConfig.getURL();
            headers = { "Content-Type": "application/json" };
            requestBody = { contents: [{ parts: [{ text: prompt }] }] };
            break;

        case 'OPENROUTER':
        case 'GROQ':
            apiUrl = providerConfig.URL;
            headers = {
                Authorization: `Bearer ${providerConfig.API_KEY}`,
                "Content-Type": "application/json",
            };
            if (CURRENT_PROVIDER === 'OPENROUTER') {
                headers["HTTP-Referer"] = "https://github.com/ancient-ai/ai-answer";
                headers["X-Title"] = "AI Answers Forms";
            }
            requestBody = {
                model: providerConfig.MODEL,
                messages: [{ role: "user", content: prompt }],
            };
            break;

        default:
            return `<strong>Configuration Error:</strong><br>Invalid provider "${CURRENT_PROVIDER}" selected.`;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error({ msg: `Error in ${CURRENT_PROVIDER} API`, error: errorData });
      return `<strong>${CURRENT_PROVIDER} API Error:</strong><br><pre>${JSON.stringify(
        errorData,
        null,
        2
      )}</pre>`;
    }

    const data = await response.json();
    let answer;

    switch (CURRENT_PROVIDER) {
        case 'GEMINI':
            answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
            break;
        case 'OPENROUTER':
        case 'GROQ':
            answer = data.choices?.[0]?.message?.content;
            break;
    }

    if (answer) {
      console.log("ans " + answer);
      return answer;
    }
    return `No answer found in ${CURRENT_PROVIDER} response.`;
  } catch (error) {
    console.error({ msg: "Error in API", error });
    return `<strong>Request Failed:</strong><br><pre>${error.message}</pre>`;
  }
};

const convertMarkdownToHtml = (markdown) => {
  let html = markdown.replace(
    /^(#{1,6})\s*(.*?)(\n|$)/gm,
    (match, hashes, title) => {
      const level = hashes.length;
      return `<h${level}>${title.trim()}</h${level}>`;
    }
  );

  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");
  html = html.replace(/`(.*?)`/g, "<code>$1</code>");
  html = html.replace(
    /\\\[(.*?)\\\]/gs,
    '<div class="math-block">\\[$1\\]</div>'
  );
  html = html.replace(
    /\\\((.*?)\\\)/g,
    '<span class="math-inline">\\($1\\)</span>'
  );
  html = html.replace(/^\s*\*\s+(.*)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\s*)+/g, "<ul>$&</ul>");
  html = html.replace(/^\s*\d+\.\s+(.*)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\s*)+/g, "<ol>$&</ol>");
  html = html.replace(/(?<!<\/(li|h[1-6]|div|ul|ol|span)>)\n/g, "<br>");
  return html;
};

// Asks the background script to fetch an image and convert it to a base64 string
const imageUrlToBase64 = (url) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "fetchImageAsBase64", url: url },
      (response) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        if (response.error) {
          return reject(new Error(response.error));
        }
        resolve(response);
      }
    );
  });
};

const getImageAns = async (url, question = "", options = []) => {
  try {
    if (CURRENT_PROVIDER === 'GROQ') {
        return "<strong>Provider Error:</strong><br>Groq does not support image-based questions.";
    }

    let prompt = `${basePrompt} ${question}. If the primary question is in the image, use that to find the answer. `;
    if (options.length > 0) {
      prompt += `Options are:\n`;
      options.forEach((opt, i) => {
        prompt += `${i + 1}. ${opt}\n`;
      });
    }

    const { base64, mimeType } = await imageUrlToBase64(url);

    let requestBody, apiUrl, headers;
    const providerConfig = API_CONFIG[CURRENT_PROVIDER];

    if (!providerConfig || providerConfig.API_KEY.startsWith("YOUR_")) {
        return `ERROR: Please set your ${CURRENT_PROVIDER} API key in the extension's main.js file.`;
    }

    switch (CURRENT_PROVIDER) {
        case 'GEMINI':
            apiUrl = providerConfig.getURL();
            headers = { "Content-Type": "application/json" };
            requestBody = {
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: mimeType, data: base64 } }
                    ]
                }]
            };
            break;

        case 'OPENROUTER':
            apiUrl = providerConfig.URL;
            headers = {
                Authorization: `Bearer ${providerConfig.API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/ancient-ai/ai-answer",
                "X-Title": "AI Answers Forms",
            };
            requestBody = {
                model: providerConfig.MODEL,
                messages: [{
                    role: "user",
                    content: [
                        { text: prompt },
                        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } }
                    ]
                }],
            };
            break;

        default:
             return `<strong>Configuration Error:</strong><br>Invalid provider "${CURRENT_PROVIDER}" selected for image question.`;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error({ msg: `Error in ${CURRENT_PROVIDER} API`, error: errorData });
      return `<strong>${CURRENT_PROVIDER} API Error:</strong><br><pre>${JSON.stringify(
        errorData,
        null,
        2
      )}</pre>`;
    }

    const data = await response.json();
    let answer;

    switch (CURRENT_PROVIDER) {
        case 'GEMINI':
            answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
            break;
        case 'OPENROUTER':
            answer = data.choices?.[0]?.message?.content;
            break;
    }

    console.log("res:" + answer);
    return answer || `No answer found in ${CURRENT_PROVIDER} response.`;
  } catch (error) {
    console.error({ msg: "Error in API", error });
    return `<strong>Request Failed:</strong><br><pre>${error.message}</pre>`;
  }
};

const getAnswers = async () => {
  const questionElements = Array.from(
    document.querySelectorAll("div.Qr7Oae")
  ).map((el) => el.querySelector("div"));

  const solution = [];
  let promises = [];

  for (let i = 0; i < questionElements.length; i++) {
    promises.push(
      new Promise(async (resolve, reject) => {
        try {
          const question = questionElements[i];
          const questionData = JSON.parse(
            "[" + question.getAttribute("data-params").substring(4)
          );
          const questionObject = questionData[0];

          let answer = "";

          const image = question.querySelector("img");
          if (image) {
            const url = image.src;
            const questionText = questionObject[1];
            const questionOptions = Array.from(questionObject[4][0][1]).map(
              (el) => el[0]
            );

            console.log("calling image api");
            answer = await getImageAns(url, questionText, questionOptions);
            console.log("ansss:" + answer);
            solution.push({ ind: i, questionText: "Image", answer });

            let node = document.createElement("span");
            node.classList.add("ai_answers");
            node.innerHTML = convertMarkdownToHtml(answer);
            question.parentElement.insertBefore(node, question);
            node.style.display = "none";

            // 🆕 Auto-select option
            const trimmedAnswer = (answer || "").trim();
            let optionIndex = -1;

            // First, try for an exact match
            const exactMatchIndex = questionOptions.findIndex(
              (opt) => opt.trim() === trimmedAnswer
            );

            if (exactMatchIndex !== -1) {
              optionIndex = exactMatchIndex;
            } else {
              // Fallback: find the longest option text that is a substring of the answer
              let bestMatchIndex = -1;
              let longestMatch = 0;
              questionOptions.forEach((opt, index) => {
                if (trimmedAnswer.includes(opt.trim()) && opt.trim().length > longestMatch) {
                  longestMatch = opt.trim().length;
                  bestMatchIndex = index;
                }
              });
              optionIndex = bestMatchIndex;
            }

            if (optionIndex !== -1) {
              const optionDivs = question.querySelectorAll(
                '[role="radio"], [role="checkbox"]'
              );
              if (optionDivs[optionIndex]) {
                optionDivs[optionIndex].click();
              }
            }
          } else {
            const questionText = questionObject[1];
            const questionOptions = Array.from(questionObject[4][0][1]).map(
              (el) => el[0]
            );

            if (questionText && questionOptions.length > 0) {
              answer = await getTextAnswers(
                questionText,
                questionOptions,
                i + 1
              );
              solution.push({ ind: i, questionText, answer });

              let node = document.createElement("span");
              node.classList.add("ai_answers");
              node.innerHTML = convertMarkdownToHtml(answer);
              question.parentElement.insertBefore(node, question);
              node.style.display = "none";

              // 🆕 Auto-select option
              const trimmedAnswer = (answer || "").trim();
              let optionIndex = -1;

              // First, try for an exact match
              const exactMatchIndex = questionOptions.findIndex(
                (opt) => opt.trim() === trimmedAnswer
              );

              if (exactMatchIndex !== -1) {
                optionIndex = exactMatchIndex;
              } else {
                // Fallback: find the longest option text that is a substring of the answer
                let bestMatchIndex = -1;
                let longestMatch = 0;
                questionOptions.forEach((opt, index) => {
                  if (trimmedAnswer.includes(opt.trim()) && opt.trim().length > longestMatch) {
                    longestMatch = opt.trim().length;
                    bestMatchIndex = index;
                  }
                });
                optionIndex = bestMatchIndex;
              }

              if (optionIndex !== -1) {
                const optionDivs = question.querySelectorAll(
                  '[role="radio"], [role="checkbox"]'
                );
                if (optionDivs[optionIndex]) {
                  optionDivs[optionIndex].click();
                }
              }
            } else {
              console.warn(`Question ${i + 1} data is missing or invalid`);
            }
          }

          resolve();
        } catch (error) {
          console.error({
            msg: `Error in execution for question ${i + 1}`,
            error,
          });
          reject();
        }
      })
    );
  }

  await Promise.all(promises);
  solution.sort((a, b) => a.ind - b.ind);
};

const toggleAnswers = () => {
  let answers = document.getElementsByClassName("ai_answers");
  Array.from(answers).forEach((el) => {
    if (el.style.display === "none") {
      el.style.display = "block";
    } else {
      el.style.display = "none";
    }
  });
};

const deleteAnswers = () => {
  let answers = document.getElementsByClassName("ai_answers");
  Array.from(answers).forEach((el) => el.parentElement.removeChild(el));
};
