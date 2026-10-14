// src/Services/spellCheckService.js
// Server-side spelling mistake & academic typo detection service

const COMMON_TYPOS = {
  "teh": "the",
  "recieve": "receive",
  "recieved": "received",
  "recieving": "receiving",
  "reciever": "receiver",
  "seperate": "separate",
  "seperated": "separated",
  "seperating": "separating",
  "seperation": "separation",
  "definately": "definitely",
  "definatly": "definitely",
  "definetly": "definitely",
  "occured": "occurred",
  "occuring": "occurring",
  "occurance": "occurrence",
  "occurrance": "occurrence",
  "untill": "until",
  "truely": "truly",
  "goverment": "government",
  "enviroment": "environment",
  "enviromental": "environmental",
  "beleive": "believe",
  "beleived": "believed",
  "beleiving": "believing",
  "acheive": "achieve",
  "acheived": "achieved",
  "acheiving": "achieving",
  "acheivement": "achievement",
  "alot": "a lot",
  "accommodate": "accommodate",
  "acommodate": "accommodate",
  "accomodate": "accommodate",
  "accross": "across",
  "agressive": "aggressive",
  "arguement": "argument",
  "arguements": "arguments",
  "assigment": "assignment",
  "assigments": "assignments",
  "begining": "beginning",
  "calender": "calendar",
  "collegue": "colleague",
  "collegues": "colleagues",
  "compleatly": "completely",
  "concious": "conscious",
  "curiousity": "curiosity",
  "disapear": "disappear",
  "disapeared": "disappeared",
  "dissapoint": "disappoint",
  "dissapointed": "disappointed",
  "embarass": "embarrass",
  "embarassed": "embarrassed",
  "existance": "existence",
  "foriegn": "foreign",
  "fourty": "forty",
  "freind": "friend",
  "garantee": "guarantee",
  "guarentee": "guarantee",
  "guidance": "guidance",
  "harrass": "harass",
  "hieght": "height",
  "hygiene": "hygiene",
  "independant": "independent",
  "inteligence": "intelligence",
  "intrest": "interest",
  "knowlege": "knowledge",
  "liason": "liaison",
  "libary": "library",
  "maintainance": "maintenance",
  "mispell": "misspell",
  "mispelled": "misspelled",
  "neccessary": "necessary",
  "necesary": "necessary",
  "noticable": "noticeable",
  "ocassion": "occasion",
  "paralel": "parallel",
  "peice": "piece",
  "plagarism": "plagiarism",
  "posession": "possession",
  "potatos": "potatoes",
  "preceed": "precede",
  "prefered": "preferred",
  "presense": "presence",
  "privelege": "privilege",
  "priviledge": "privilege",
  "pronounciation": "pronunciation",
  "pubicly": "publicly",
  "questionaire": "questionnaire",
  "realy": "really",
  "reccomend": "recommend",
  "recomand": "recommend",
  "refered": "referred",
  "relavent": "relevant",
  "religous": "religious",
  "rember": "remember",
  "resistence": "resistance",
  "rythm": "rhythm",
  "similer": "similar",
  "succesful": "successful",
  "suprise": "surprise",
  "suprised": "surprised",
  "tendancy": "tendency",
  "tommorow": "tomorrow",
  "tomorow": "tomorrow",
  "tounge": "tongue",
  "unfortunatly": "unfortunately",
  "wierd": "weird",
  "wich": "which",
  "whith": "with",
  "writting": "writing",
  "thier": "their",
  "therfore": "therefore",
  "grammer": "grammar",
  "judgement": "judgment",
  "conseqence": "consequence",
  "developement": "development",
  "experiance": "experience",
  "experimant": "experiment",
  "fundamantal": "fundamental",
  "generaly": "generally",
  "immediatly": "immediately",
  "implimentation": "implementation",
  "importent": "important",
  "maintenence": "maintenance",
  "neigbor": "neighbor",
  "oppurtunity": "opportunity",
  "performence": "performance",
  "posible": "possible",
  "practise": "practice",
  "programing": "programming",
  "relevent": "relevant",
  "simultanious": "simultaneous",
  "specificaly": "specifically",
  "stratergy": "strategy",
  "temperment": "temperament",
  "thru": "through",
  "unforseen": "unforeseen",
  "usful": "useful",
  "valuble": "valuable",
  "varient": "variant",
  "visable": "visible",
  "vunerable": "vulnerable",
  "yeild": "yield",
  "algoritm": "algorithm",
  "algoritms": "algorithms",
  "analisis": "analysis",
  "computor": "computer",
  "datastructure": "data structure",
  "dificult": "difficult",
  "efficent": "efficient",
  "efficently": "efficiently",
  "efficency": "efficiency",
  "exsample": "example",
  "functon": "function",
  "langauge": "language",
  "memorise": "memorize",
  "nescessary": "necessary",
  "optomize": "optimize",
  "paramater": "parameter",
  "pseudocod": "pseudocode",
  "recusion": "recursion",
  "referance": "reference",
  "softwere": "software",
  "solutuon": "solution",
  "statment": "statement",
  "strcture": "structure",
  "techique": "technique",
  "variabel": "variable",
  "speling": "spelling",
  "spel": "spell",
  "spellng": "spelling",
  "gargg": "garg",
  "benefitts": "benefits",
  "enviornment": "environment",
  "enviornmental": "environmental",
  "runing": "running",
  "comming": "coming",
  "writting": "writing",
  "writen": "written",
  "beggining": "beginning",
  "begginer": "beginner",
  "studing": "studying",
  "learnng": "learning",
  "programing": "programming",
  "programer": "programmer",
  "programers": "programmers",
  "succesfully": "successfully",
  "sucessfully": "successfully",
  "sucess": "success",
  "seperately": "separately",
  "accidently": "accidentally",
  "accidentaly": "accidentally",
  "basicly": "basically",
  "basicaly": "basically",
  "automaticly": "automatically",
  "diferent": "different",
  "diference": "difference",
  "inteligently": "intelligently",
  "modle": "model",
  "dataset": "dataset",
  "netowrk": "network",
  "netowrks": "networks",
  "artifical": "artificial",
  "functonality": "functionality",
  "submision": "submission",
  "evalution": "evaluation",
  "practicle": "practical"
};

const COMMON_ENGLISH_WORDS = new Set([
  "about", "after", "again", "against", "algorithm", "algorithms", "almost", "already",
  "also", "always", "among", "analysis", "another", "answer", "appear", "appeared",
  "approach", "argument", "around", "artificial", "assignment", "assignments", "because",
  "become", "before", "begin", "beginning", "behavior", "between", "black", "called",
  "change", "changes", "character", "clean", "color", "come", "coming", "common",
  "company", "compare", "compared", "complete", "completely", "computer", "condition",
  "consider", "content", "continue", "control", "correct", "correction", "could", "course",
  "create", "created", "current", "database", "decision", "describe", "detail", "detailed",
  "develop", "development", "difference", "different", "difficult", "direction", "document",
  "documents", "during", "early", "effect", "effective", "efficient", "efficiently",
  "element", "elements", "enough", "entire", "environment", "evaluation", "every", "example",
  "examples", "exercise", "exist", "experience", "experiment", "family", "feature", "features",
  "figure", "file", "files", "filter", "finally", "find", "first", "following", "form",
  "found", "friend", "function", "functions", "further", "general", "generally", "given",
  "government", "great", "group", "happen", "having", "history", "however", "human",
  "idea", "important", "improve", "include", "including", "increase", "information",
  "instead", "intelligence", "interest", "interesting", "introduce", "issue", "itself",
  "knowledge", "language", "large", "later", "learn", "learning", "leave", "level",
  "likely", "little", "machine", "maintain", "maintenance", "major", "making", "material",
  "matter", "measure", "method", "methods", "middle", "might", "minute", "mistake",
  "mistakes", "model", "models", "modern", "moment", "multiple", "national", "natural",
  "necessary", "network", "networks", "never", "nothing", "number", "numbers", "object",
  "obtain", "occur", "occurred", "office", "often", "operation", "order", "original",
  "other", "others", "output", "paragraph", "parallel", "particular", "pattern", "people",
  "percent", "percentage", "performance", "period", "person", "phrase", "phrases", "place",
  "plagiarism", "point", "position", "possible", "potential", "practice", "present",
  "presentation", "previous", "primary", "problem", "process", "produce", "program",
  "programming", "project", "proper", "provide", "provided", "public", "purpose", "question",
  "rather", "reach", "receive", "received", "record", "reference", "references", "relate",
  "relevant", "remember", "report", "reports", "require", "required", "research", "resource",
  "result", "results", "return", "running", "sample", "school", "science", "second",
  "section", "sections", "security", "sentence", "separate", "sequence", "service", "several",
  "should", "similar", "similarity", "simple", "single", "software", "solution", "source",
  "spelling", "standard", "statement", "strategy", "structure", "student", "students",
  "study", "studying", "subject", "submission", "successful", "successfully", "suggest",
  "suggestion", "summary", "support", "surface", "system", "teacher", "technique", "technology",
  "testing", "theory", "therefore", "things", "through", "together", "tomorrow", "toward",
  "understand", "university", "unless", "useful", "usually", "value", "variable", "various",
  "version", "weight", "whether", "window", "without", "words", "working", "writing", "written"
]);

function calcLevenshtein(s1, s2, maxDist = 2) {
  if (s1 === s2) return 0;
  if (Math.abs(s1.length - s2.length) > maxDist) return maxDist + 1;
  const m = s1.length;
  const n = s2.length;
  let prev = Array(n + 1).fill(0);
  let curr = Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let minRow = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      minRow = Math.min(minRow, curr[j]);
    }
    if (minRow > maxDist) return maxDist + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

const VALID_ACRONYMS = new Set([
  "cpu", "gpu", "css", "html", "sql", "xml", "pdf", "txt", "png", "jpg", "svg",
  "cdn", "api", "url", "id", "tv", "pc", "etc", "ftp", "rpm", "nth", "by", "my",
  "why", "dry", "fly", "sky", "gym", "spy", "cry", "try", "dnn", "cnn", "rnn", "lstm",
  "nlp", "ml", "ai", "svm", "knn", "pca", "sdlc", "dbms", "os", "ram", "rom"
]);

/**
 * Detect spelling mistakes in a given text based on academic typo dictionary.
 * @param {string} text
 * @param {string} docLabel
 * @param {object|string} options
 * @returns {Array<{ word: string, suggestion: string, startIndex: number, endIndex: number, context: string, docLabel: string }>}
 */
function detectSpellingMistakes(text, docLabel = "Document", options = {}) {
  if (!text || typeof text !== "string") {
    return [];
  }

  const mistakes = [];
  const peerText = typeof options === "string" ? options : (options && options.peerText ? options.peerText : "");

  const peerWordsMap = new Map();
  if (peerText && typeof peerText === "string") {
    const pRegex = /\b[a-zA-Z]{3,}\b/g;
    let pMatch;
    while ((pMatch = pRegex.exec(peerText)) !== null) {
      const pLower = pMatch[0].toLowerCase();
      if (!peerWordsMap.has(pLower)) {
        peerWordsMap.set(pLower, pMatch[0]);
      }
    }
  }

  const wordRegex = /\b[a-zA-Z]{2,}\b/g;
  let match;

  while ((match = wordRegex.exec(text)) !== null) {
    const rawWord = match[0];
    const lowerWord = rawWord.toLowerCase();
    let suggestion = null;

    if (Object.prototype.hasOwnProperty.call(COMMON_TYPOS, lowerWord)) {
      suggestion = COMMON_TYPOS[lowerWord];
    }

    if (!suggestion && lowerWord.length >= 5) {
      if (lowerWord.endsWith("ly")) {
        const stem = lowerWord.slice(0, -2);
        if (COMMON_TYPOS[stem]) {
          suggestion = COMMON_TYPOS[stem] + "ly";
        } else if (COMMON_TYPOS[stem + "e"]) {
          suggestion = COMMON_TYPOS[stem + "e"] + "ly";
        }
      } else if (lowerWord.endsWith("ing")) {
        const stem = lowerWord.slice(0, -3);
        if (COMMON_TYPOS[stem]) {
          suggestion = COMMON_TYPOS[stem] + "ing";
        } else if (COMMON_TYPOS[stem + "e"]) {
          suggestion = COMMON_TYPOS[stem + "e"].replace(/e$/, "ing");
        }
      }
    }

    if (!suggestion && lowerWord.length >= 4) {
      const reducedEnd = lowerWord.replace(/([^lszf])\1+$/i, "$1");
      const reducedAll = lowerWord.replace(/(.)\1{2,}/g, "$1");
      if (reducedEnd !== lowerWord && (peerWordsMap.has(reducedEnd) || COMMON_ENGLISH_WORDS.has(reducedEnd))) {
        suggestion = peerWordsMap.get(reducedEnd) || reducedEnd;
      } else if (reducedAll !== lowerWord && (peerWordsMap.has(reducedAll) || COMMON_ENGLISH_WORDS.has(reducedAll))) {
        suggestion = peerWordsMap.get(reducedAll) || reducedAll;
      }
    }

    if (!suggestion && peerWordsMap.size > 0 && lowerWord.length >= 4 && !peerWordsMap.has(lowerWord)) {
      let bestPeerDist = 99;
      let bestPeerWord = null;
      for (const [pWord, originalP] of peerWordsMap.entries()) {
        const maxAllowed = lowerWord.length >= 7 ? 2 : 1;
        const d = calcLevenshtein(lowerWord, pWord, maxAllowed);
        if (d > 0 && d <= maxAllowed && d < bestPeerDist) {
          bestPeerDist = d;
          bestPeerWord = originalP;
        }
      }
      if (bestPeerWord) {
        suggestion = bestPeerWord;
      }
    }

    if (!suggestion && lowerWord.length >= 4 && !COMMON_ENGLISH_WORDS.has(lowerWord) && !peerWordsMap.has(lowerWord)) {
      for (const validWord of COMMON_ENGLISH_WORDS) {
        if (Math.abs(validWord.length - lowerWord.length) <= 1) {
          const d = calcLevenshtein(lowerWord, validWord, 1);
          if (d === 1) {
            suggestion = validWord;
            break;
          }
        }
      }
    }

    if (!suggestion && lowerWord.length >= 3 && !/[aeiouy]/.test(lowerWord)) {
      if (!VALID_ACRONYMS.has(lowerWord)) {
        suggestion = "[Unrecognized word / Typo]";
      }
    }

    if (suggestion) {
      let formattedSuggestion = suggestion;
      if (rawWord[0] === rawWord[0].toUpperCase() && rawWord[0] !== rawWord[0].toLowerCase() && !suggestion.startsWith("[")) {
        formattedSuggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
      }

      const startContext = Math.max(0, match.index - 35);
      const endContext = Math.min(text.length, match.index + rawWord.length + 35);
      let context = text.substring(startContext, endContext).replace(/\s+/g, " ").trim();

      if (startContext > 0) context = "..." + context;
      if (endContext < text.length) context = context + "...";

      mistakes.push({
        word: rawWord,
        suggestion: formattedSuggestion,
        startIndex: match.index,
        endIndex: match.index + rawWord.length,
        context: context,
        docLabel: docLabel
      });
    }
  }

  return mistakes;
}

module.exports = {
  COMMON_TYPOS,
  detectSpellingMistakes
};
