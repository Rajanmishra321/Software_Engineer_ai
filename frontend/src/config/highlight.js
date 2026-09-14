import hljs from 'highlight.js/lib/core';
import 'highlight.js/styles/github-dark.css';

import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import rust from 'highlight.js/lib/languages/rust';
import go from 'highlight.js/lib/languages/go';
import kotlin from 'highlight.js/lib/languages/kotlin';
import swift from 'highlight.js/lib/languages/swift';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';

const LANGUAGES = { javascript, python, typescript, rust, go, kotlin, swift, html: xml, xml, css, json, bash };

Object.entries(LANGUAGES).forEach(([name, definition]) => hljs.registerLanguage(name, definition));
hljs.registerAliases(['js', 'jsx'], { languageName: 'javascript' });
hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' });
hljs.registerAliases(['sh', 'shell'], { languageName: 'bash' });

/**
 * Returns highlighted HTML for `code`. highlight.js escapes the input, so
 * the result is safe to render with dangerouslySetInnerHTML.
 */
export const highlightCode = (code, language) => {
    if (language && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    }
    return hljs.highlightAuto(code).value;
};
