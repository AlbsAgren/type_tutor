// variables to hold text and game data
let spanArray = [];
let texts = { "items": [ ] };
let gameData = {
    "cursor": 0,
    "errors": 0,
    "entries": 0,
    "startTime": null
};

// get the text resource and set the event listeners when the pages loads
function init() {
    getTextJSON();
    setEventListeners();
}

// get texts from texts.json resource using XMLHttpRequest
// adapted from https://www.w3schools.com/xml/xml_http.asp
function getTextJSON() {
    let request = new XMLHttpRequest();
    const url = "texts.json";

    request.open("GET", url, true);

    // if request successful, parse and save the resulting texts
    request.onreadystatechange = function() {
        if(this.readyState == 4 && this.status == 200) {
            // parse the response and store in texts variable
            JSON.parse(this.responseText).items.forEach(txt => {
                texts.items.push(txt);
            });
            // fill the document with the retrieved texts
            loadAvailableTexts();
        }
    };
    request.send();
}

// sets the event listeners required for the functionality of the page
function setEventListeners() {
    document.getElementById("play-button")
        .addEventListener("click", changeGameState, false);
    document.getElementById("text-selector")
        .addEventListener("change", changeText, false);
    document.getElementById("input-field")
        .addEventListener("input", processKeystroke, false);

    document.getElementById("swedish")
        .addEventListener("click", loadAvailableTexts, false);
    document.getElementById("english")
        .addEventListener("click", loadAvailableTexts, false);
}

// starts or stops the game when the play-button is pressed
function changeGameState() {
    let button = document.getElementById("play-button");
    let inputField = document.getElementById("input-field");

    // if the play button is pressed, change the image,
    // start the game and focus the users cursor on the input field
    if(button.src.endsWith("play_button.png")) {
        button.src = "img/stop_button.png";
        button.alt = "stop-button";

        inputField.disabled = false;
        inputField.focus();
        inputField.value = "";
        inputField.placeholder = "";

        // disable the options menu while game is running
        setOptionsDisabledProperty(true);
        // start a new game
        startNewGame();
    // if the button is pressed when the game is running,
    // disable the input field and reenable the options
    } else {
        button.src = "img/play_button.png";
        button.alt = "play-button";

        inputField.blur();
        inputField.value = "";
        inputField.disabled = true;
        inputField.placeholder = "Type here!";

        setOptionsDisabledProperty(false);
    }
}

// change the disabled property to disable or enable all game options
function setOptionsDisabledProperty(property) {
    document.getElementById("ignore-casing").disabled = property;
    document.getElementById("swedish").disabled = property;
    document.getElementById("english").disabled = property;
    document.getElementById("text-selector").disabled = property;
}

// restores the styling on the text, sets the game data to initial values
// and starts a timer
function startNewGame() {
    // reset the styling in case there was a previous game
    spanArray.forEach(span => {
        span.className = "untyped-char";
    });

    // reset the stat fields
    let values = document.getElementsByClassName("stats-value");
    const valLen = values.length;
    for(let i = 0; i < valLen; ++i) {
        values.item(i).innerHTML = 0;
    }

    // reset the game data
    gameData.cursor = 0;
    gameData.errors = 0;
    gameData.entries = 0;
    gameData.startTime = new Date().getTime();

    // mark the first character to be typed
    spanArray[0].className = "selected-char";
}

// triggers when user enters something into the input field and checks if input
// matches expected char from the text being typed
function processKeystroke(e) {
    // determine ignore-casing box is checked
    const caseInsensitive = document.getElementById("ignore-casing").checked;

    // let user delete characters in an "unsubmitted" word
    if(e.inputType === "deleteContentBackward") {
        spanArray[gameData.cursor].className = "untyped-char";
        // move cursor back one character
        gameData.cursor -= 1;
        spanArray[gameData.cursor].className = "selected-char";
    } else {
        // compare the entered char with the corresponding char in the array and
        // adjust relevant span as appropriate
        if(checkMatch(e.data, spanArray[gameData.cursor].innerHTML, caseInsensitive)) {
            spanArray[gameData.cursor].className = "typed-char";

        // true if user input incorrect
        } else {
            // get the audio element and play the associated sound
            document.getElementById("error-sound").play();
            spanArray[gameData.cursor].className = "incorrect-char";
            gameData.errors += 1;
        }
        // move the cursor and increment the entries variable
        gameData.cursor += 1;
        gameData.entries += 1;

        // if at end of text, update stats and stop game
        if(gameData.cursor === spanArray.length) {
            updateStats();
            changeGameState();
            return;
        }

        // mark the next char as selected
        spanArray[gameData.cursor].className = "selected-char";
    }

    // clear input field when user hits space
    if(e.data === " ") {
        e.target.value = "";
    } 

    // update stats on every entered character
    updateStats();
}

// check if 2 chars match, with an option to make it case insensitive
function checkMatch(char1, char2, caseInsensitive) {
    // set both chars to lower case if caseInsensitive
    char1 = (caseInsensitive) ? char1.toLowerCase() : char1;
    char2 = (caseInsensitive) ? char2.toLowerCase() : char2;

    // compare chars and return result
    return char1 === char2;
}

function updateStats() {
    // calculate elapsed time in minutes
    const elapsedTime = (new Date().getTime() - gameData.startTime) / 60000;

    // calculate the different statistics using the formulas from the project description
    const grossWPM = (gameData.entries / 5) / elapsedTime;
    const netWPM = grossWPM - (gameData.errors / elapsedTime);
    const accuracy = ((gameData.entries - gameData.errors) / gameData.entries) * 100;

    // update the document with the new values
    document.getElementById("gross-wpm").innerHTML = Math.round(grossWPM);
    // set zero as lowest possibly value to avoid negative net wpm stats
    document.getElementById("net-wpm")
        .innerHTML = (netWPM < 0) ? 0 : Math.round(netWPM);

    document.getElementById("accuracy").innerHTML = Math.round(accuracy);
    document.getElementById("errors").innerHTML = gameData.errors;
}

// change the text when the user selects a new one from the select element
function changeText(e) {
    let textContent = document.getElementById("text-content");
    // clear the previous text
    textContent.innerHTML = "";

    // find the selected text object by title, pattern adapted from:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    selectedText = texts.items.find( ({ title }) => title === e.target.value);

    // create an array of spanned characters and save insert into document
    spanArray = spanStringChars(selectedText.text);
    insertSpannedChars(spanArray);
    spanArray[0].className = "selected-char";

    // add title and text info to document
    document.getElementById("text-title").innerHTML = selectedText.title;
    document.getElementById("text-info").innerHTML = getTextInfo(selectedText);
}

// takes a string of characters and puts them into individual spans,
// returns an array of the span elements
function spanStringChars(text) {
    let charArray =  [];

    // iterate through string and span each char
    const textLen = text.length;
    for(let i = 0; i < textLen; ++i) {
        newElement = document.createElement("span");
        newElement.innerHTML = text[i];
        newElement.className = "untyped-char";
        charArray.push(newElement);
    }
    return charArray;
}

// insert each span into the text content area
function insertSpannedChars(charArray) {
    textContent = document.getElementById("text-content");
    charArray.forEach(span => {
        textContent.appendChild(span);
    });
}

// takes the available texts and makes them available to be selected by the user
function loadAvailableTexts() {
    let selector = document.getElementById("text-selector");

    // clear selector
    selector.innerHTML = "";
    // clear content area
    document.getElementById("text-content").innerHTML = "";

    // get selected language,
    // pattern adapted from: https://stackoverflow.com/a/17796775
    const language = document.querySelector('input[name = "language"]:checked').value;

    // create option elements for each of the texts of the chosen language
    // and insert them into the selector
    texts.items.forEach(text => {
        // only insert the ones matching the chosen language
        if(text.language === language) {
            newOption = document.createElement("option");
            newOption.innerHTML = text.title;
            selector.appendChild(newOption);
        }
    });

    // insert the first text into the content area
    firstText = texts.items.find( ({ title }) => title === selector.firstChild.innerHTML);
    spanArray = spanStringChars(firstText.text);
    insertSpannedChars(spanArray);
    spanArray[0].className = "selected-char";

    // set the title and text info
    document.getElementById("text-title").innerHTML = firstText.title;
    document.getElementById("text-info").innerHTML = getTextInfo(firstText);
}

function getTextInfo(textObj) {
    // return a formatted string with the author, number of words and number of
    // chars. number of words is calculated by splitting the text at
    // spaces and counting the length of the resulting array
    return textObj.author + " (" + textObj.text.split(" ").length + " words, "
                          + textObj.text.length + " characters)";
}

window.addEventListener("load", init, false);
