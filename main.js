const OPENROUTER_API_KEY = "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"; // ❗ PASTE YOUR OPENROUTER API KEY HERE
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = "deepseek/deepseek-chat-v3.1:free"; // Or any other model from OpenRouter

const basePrompt = `Please provide an answer for the following multiple-choice question. At the end of your explanation, you must provide the final answer in the format: 'Option : A' or 'Option : 1', where the letter or number corresponds to the correct choice. Question: `;

const getTextAnswers = async (question = "", options = [], ind = 0) => {
  try {
    if (
      OPENROUTER_API_KEY === "YOUR_OPENROUTER_API_KEY_HERE" ||
      !OPENROUTER_API_KEY
    ) {
      return "ERROR: Please set your OpenRouter API key in the extension's main.js file.";
    }

    let prompt = `${basePrompt} ${question}  `;
    if (options.length > 0) {
      prompt += `Options are: `;
      options.forEach((opt, i) => {
        prompt += `${i + 1}. ${opt} `;
      });
    }

    const requestBody = {
      model: MODEL_NAME,
      messages: [{ role: "user", content: prompt }],
    };

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/ancient-ai/ai-answer", // Optional but recommended
        "X-Title": "AI Answers Forms", // Optional but recommended
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error({ msg: "Error in OpenRouter API", error: errorData });
      return `<strong>OpenRouter API Error:</strong><br><pre>${JSON.stringify(
        errorData,
        null,
        2
      )}</pre>`;
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    if (answer) {
      console.log("ans " + answer);
      return answer;
    }
    return "No answer found in OpenRouter response.";
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
    let prompt = `${basePrompt} ${question}. If the primary question is in the image, use that to find the answer. `;
    if (options.length > 0) {
      prompt += `Options are:\n`;
      options.forEach((opt, i) => {
        prompt += `${i + 1}. ${opt}\n`;
      });
    }

    const { base64, mimeType } = await imageUrlToBase64(url);

    const requestBody = {
      model: MODEL_NAME,
      messages: [
        {
          role: "user",
          content: [
            { text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
    };
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/ancient-ai/ai-answer", // Optional
        "X-Title": "AI Answers Forms", // Optional
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error({ msg: "Error in OpenRouter API", error: errorData });
      return `<strong>OpenRouter API Error:</strong><br><pre>${JSON.stringify(
        errorData,
        null,
        2
      )}</pre>`;
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    console.log("res:" + answer);
    return answer || "No answer found in OpenRouter response.";
  } catch (error) {
    console.error({ msg: "Error in API", error });
    return `<strong>Request Failed:</strong><br><pre>${error.message}</pre>`;
  }
};

const extractOptionIndex = (answer) => {
  const match = answer.match(/Option\s*:?[\s_]*([0-9]+)/i);
  const match2 = answer.match(/Option\s*:?[\s_]*([a-zA-Z])/i);
  if (match2 && match2[1]) {
    const index = match2[1].toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0);
    return index;
  }
  // falback case
  if (match && match[1]) {
    return parseInt(match[1], 10) - 1;
  }
  return -1;
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

            // 🆕 Auto-select option
            const optionIndex = extractOptionIndex(answer);
            if (optionIndex >= 0 && optionIndex < questionOptions.length) {
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

              // 🆕 Auto-select option
              const optionIndex = extractOptionIndex(answer);
              if (optionIndex >= 0 && optionIndex < questionOptions.length) {
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
