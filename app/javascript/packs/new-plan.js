import { parse } from 'best-effort-json-parser';

document.getElementById('plan-length').addEventListener('change', function() {
  var customLengthGroup = document.getElementById('custom-length-group');
  if (this.value === 'custom') {
    customLengthGroup.style.display = 'flex';
  } else {
    customLengthGroup.style.display = 'none';
  }
});

document.getElementById('custom-length').addEventListener('input', function() {
  var min = parseInt(this.min);
  var max = parseInt(this.max);
  var value = parseInt(this.value);

  if (value < min) {
    this.value = min;
  } else if (value > max) {
    this.value = max;
  }
});

const generatePlanButton = document.getElementById('generate-plan');

generatePlanButton.addEventListener('click', function(event) {
  event.preventDefault();

  var topic = document.getElementById('plan-topic').value;
  var length = document.getElementById('plan-length').value;
  if (length === 'custom') {
    length = document.getElementById('custom-length').value;
  }

  generatePlanButton.disabled = true;

  // Make an API request to generate the plan
  fetch('/api/generate_plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
    },
    body: JSON.stringify({ topic: topic, length: length })
  })
  .then(response => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';
    let completion = '';

    function read() {
      reader.read().then(({ done, value }) => {
        if (done) {
          console.log('Stream complete');
          return;
        }

        result += decoder.decode(value, { stream: true });
        const lines = result.split('\n\n');
        result = lines.pop(); // Keep the last incomplete line

        lines.forEach(line => {
          // trim whitespace from start of line
          line = line.replace(/^\s+/, '');
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('Stream complete');
              generatePlanButton.disabled = false;
              console.log(completion);
            } else {
              completion += data;
              try {
                console.log(parse(completion)); // Handle the streamed data here
              } catch (e) {
                console.error(e);
              }
            }
          } else {
            completion += line;
            console.log(parse(completion)); // Handle the streamed data here
          }
        });

        read();
      });
    }

    read();
  })
  .catch(error => {
    console.error('Error:', error);
    generatePlanButton.disabled = false;
  });
});

// Cycle through suggestions for the topic input
const suggestions = shuffle([
  "God in hard times",
  "Bible on joy",
  "Jesus' parables",
  "Prayers in the Bible",
  "Loving others",
  "God's power in people",
  "Rest and peace",
  "Wisdom for today",
  "Trusting God",
  "God's plan for the world",
  "Hope in Scripture",
  "Faith during trials",
  "Walking with Jesus",
  "God's promises",
  "Healing in the Bible",
  "Forgiveness in Scripture",
  "Overcoming fear",
  "Courage from God",
  "God's love for nations",
  "Justice and mercy",
  "Strength in weakness",
  "The Holy Spirit",
  "Living by faith",
  "Peace in chaos",
  "Light in darkness",
  "God's faithfulness",
  "Jesus' miracles",
  "Bible on humility",
  "God's creation",
  "The heart of worship"
]
);
let suggestionIndex = 0;
let charIndex = 0;
const topicInput = document.getElementById('plan-topic');
const typingSpeed = 30;
const pauseDuration = 3000;
const emptyDuration = 200;
let cursorVisible = true;

function typeSuggestion() {
  if (charIndex < suggestions[suggestionIndex].length) {
    topicInput.placeholder = suggestions[suggestionIndex].substring(0, charIndex + 1) + (cursorVisible ? '|' : '');
    charIndex++;
    setTimeout(typeSuggestion, typingSpeed);
  } else {
    topicInput.placeholder = suggestions[suggestionIndex] + '|';
    setTimeout(eraseSuggestion, pauseDuration);
  }
}

function eraseSuggestion() {
  if (charIndex > 0) {
    topicInput.placeholder = suggestions[suggestionIndex].substring(0, charIndex - 1) + (cursorVisible ? '|' : '');
    charIndex--;
    setTimeout(eraseSuggestion, typingSpeed);
  } else {
    suggestionIndex = (suggestionIndex + 1) % suggestions.length;
    setTimeout(typeSuggestion, emptyDuration);
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Toggle cursor visibility every second
setInterval(() => {
  cursorVisible = !cursorVisible;
  if (topicInput.placeholder.endsWith('|')) {
    topicInput.placeholder = topicInput.placeholder.slice(0, -1);
  } else {
    topicInput.placeholder += '|';
  }
}, 500);

typeSuggestion();