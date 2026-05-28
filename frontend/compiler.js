/**
 * compiler.js
 * JavaScript port of the C→C++ Source-to-Source Compiler
 * Faithfully mirrors: Lexer.cpp, Transformer.cpp, CodeGenerator.cpp
 */

// ─── Token Types ───────────────────────────────────────────────
const TokenType = Object.freeze({
    KEYWORD:        'KEYWORD',
    IDENTIFIER:     'IDENTIFIER',
    STRING_LITERAL: 'STRING_LITERAL',
    NUMBER:         'NUMBER',
    SYMBOL:         'SYMBOL',
    PREPROCESSOR:   'PREPROCESSOR',
    WHITESPACE:     'WHITESPACE',
    COMMENT:        'COMMENT',
    UNKNOWN:        'UNKNOWN',
    END_OF_FILE:    'END_OF_FILE',
});

const C_KEYWORDS = new Set([
    'auto','break','case','char','const','continue','default','do',
    'double','else','enum','extern','float','for','goto','if',
    'int','long','register','return','short','signed','sizeof','static',
    'struct','switch','typedef','union','unsigned','void','volatile','while'
]);

// ─── Lexer ─────────────────────────────────────────────────────
class Lexer {
    constructor(source) {
        this.source = source;
        this.pos = 0;
    }

    tokenize() {
        const tokens = [];
        while (!this._isAtEnd()) {
            const c = this._peek();
            if (this._isSpace(c)) {
                tokens.push(this._consumeWhitespace());
            } else if (c === '/' && (this._peekNext() === '/' || this._peekNext() === '*')) {
                tokens.push(this._consumeComment());
            } else if (c === '#') {
                tokens.push(this._consumePreprocessor());
            } else if (c === '"' || c === "'") {
                tokens.push(this._consumeString());
            } else if (this._isDigit(c)) {
                tokens.push(this._consumeNumber());
            } else if (this._isAlpha(c) || c === '_') {
                tokens.push(this._consumeIdentifierOrKeyword());
            } else {
                tokens.push(this._consumeSymbol());
            }
        }
        tokens.push({ type: TokenType.END_OF_FILE, value: '' });
        return tokens;
    }

    _peek()          { return this._isAtEnd() ? '\0' : this.source[this.pos]; }
    _peekNext()      { return this.pos + 1 >= this.source.length ? '\0' : this.source[this.pos + 1]; }
    _advance()       { return this._isAtEnd() ? '\0' : this.source[this.pos++]; }
    _isAtEnd()       { return this.pos >= this.source.length; }
    _isSpace(c)      { return c === ' ' || c === '\t' || c === '\n' || c === '\r'; }
    _isDigit(c)      { return c >= '0' && c <= '9'; }
    _isAlpha(c)      { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'); }
    _isAlphaNum(c)   { return this._isAlpha(c) || this._isDigit(c); }

    _consumeWhitespace() {
        let val = '';
        while (!this._isAtEnd() && this._isSpace(this._peek())) val += this._advance();
        return { type: TokenType.WHITESPACE, value: val };
    }

    _consumeComment() {
        let val = '';
        if (this._peek() === '/' && this._peekNext() === '/') {
            val += this._advance(); val += this._advance();
            while (!this._isAtEnd() && this._peek() !== '\n') val += this._advance();
        } else if (this._peek() === '/' && this._peekNext() === '*') {
            val += this._advance(); val += this._advance();
            while (!this._isAtEnd()) {
                if (this._peek() === '*' && this._peekNext() === '/') {
                    val += this._advance(); val += this._advance();
                    break;
                }
                val += this._advance();
            }
        }
        return { type: TokenType.COMMENT, value: val };
    }

    _consumeString() {
        let val = '';
        const quote = this._advance();
        val += quote;
        while (!this._isAtEnd() && this._peek() !== quote) {
            if (this._peek() === '\\') {
                val += this._advance();
                if (!this._isAtEnd()) val += this._advance();
            } else {
                val += this._advance();
            }
        }
        if (!this._isAtEnd()) val += this._advance();
        return { type: TokenType.STRING_LITERAL, value: val };
    }

    _consumeNumber() {
        let val = '';
        while (!this._isAtEnd() && (this._isAlphaNum(this._peek()) || this._peek() === '.')) {
            val += this._advance();
        }
        return { type: TokenType.NUMBER, value: val };
    }

    _consumeIdentifierOrKeyword() {
        let val = '';
        while (!this._isAtEnd() && (this._isAlphaNum(this._peek()) || this._peek() === '_')) {
            val += this._advance();
        }
        const type = C_KEYWORDS.has(val) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
        return { type, value: val };
    }

    _consumePreprocessor() {
        let val = '';
        while (!this._isAtEnd() && this._peek() !== '\n') {
            if (this._peek() === '\\') {
                val += this._advance();
                if (!this._isAtEnd()) val += this._advance();
            } else {
                val += this._advance();
            }
        }
        return { type: TokenType.PREPROCESSOR, value: val };
    }

    _consumeSymbol() {
        let val = '';
        const c = this._advance();
        val += c;
        const next = this._peek();
        if (
            (c === '=' && next === '=') || (c === '!' && next === '=') ||
            (c === '<' && next === '=') || (c === '>' && next === '=') ||
            (c === '&' && next === '&') || (c === '|' && next === '|') ||
            (c === '-' && next === '>') || (c === '+' && next === '+') ||
            (c === '-' && next === '-') || (c === '+' && next === '=') ||
            (c === '-' && next === '=') || (c === '*' && next === '=') ||
            (c === '/' && next === '=') || (c === ':' && next === ':') ||
            (c === '<' && next === '<') || (c === '>' && next === '>')
        ) {
            val += this._advance();
        }
        return { type: TokenType.SYMBOL, value: val };
    }
}

// ─── Transformer ───────────────────────────────────────────────
class Transformer {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
        this.appliedRules = {
            stdio: 0,
            printf: 0,
            scanf: 0,
            malloc: 0,
            free: 0,
            struct: 0,
        };
    }

    transform() {
        const output = [];

        // Always inject #include <iostream>\nusing namespace std;\n
        output.push({ type: TokenType.PREPROCESSOR, value: '#include <iostream>\n' });
        output.push({ type: TokenType.KEYWORD,    value: 'using' });
        output.push({ type: TokenType.WHITESPACE, value: ' ' });
        output.push({ type: TokenType.IDENTIFIER, value: 'namespace' });
        output.push({ type: TokenType.WHITESPACE, value: ' ' });
        output.push({ type: TokenType.IDENTIFIER, value: 'std' });
        output.push({ type: TokenType.SYMBOL,     value: ';' });
        output.push({ type: TokenType.WHITESPACE, value: '\n' });

        while (!this._isAtEnd()) {
            const t = this._peek();

            if (t.type === TokenType.IDENTIFIER) {
                if (t.value === 'printf')      { this._transformPrintf(output); continue; }
                if (t.value === 'scanf')       { this._transformScanf(output);  continue; }
                if (t.value === 'malloc')      { this._transformMalloc(output); continue; }
                if (t.value === 'free')        { this._transformFree(output);   continue; }
            } else if (t.type === TokenType.KEYWORD && t.value === 'struct') {
                this._transformStruct(output);
                continue;
            } else if (t.type === TokenType.PREPROCESSOR &&
                (t.value.includes('<stdio.h>') || t.value.includes('<stdlib.h>'))) {
                // Remove C headers — already handled by injecting iostream
                this._advance();
                this.appliedRules.stdio++;
                continue;
            }

            output.push(this._advance());
        }

        return output;
    }

    _peek(offset = 0) {
        const i = this.pos + offset;
        if (i >= this.tokens.length) return { type: TokenType.END_OF_FILE, value: '' };
        return this.tokens[i];
    }

    _advance() {
        if (this._isAtEnd()) return { type: TokenType.END_OF_FILE, value: '' };
        return this.tokens[this.pos++];
    }

    _isAtEnd() {
        return this.pos >= this.tokens.length || this.tokens[this.pos].type === TokenType.END_OF_FILE;
    }

    _match(type, value) {
        if (this._peek().type === type && this._peek().value === value) {
            this._advance();
            return true;
        }
        return false;
    }

    _skipWhitespace() {
        while (!this._isAtEnd() &&
            (this._peek().type === TokenType.WHITESPACE || this._peek().type === TokenType.COMMENT)) {
            this._advance();
        }
    }

    _transformPrintf(output) {
        this._advance(); // consume 'printf'
        this.appliedRules.printf++;

        // pass whitespace before '('
        while (!this._isAtEnd() && this._peek().value !== '(') output.push(this._advance());

        if (this._match(TokenType.SYMBOL, '(')) {
            output.push({ type: TokenType.IDENTIFIER, value: 'cout' });

            const args = [];
            let parenCount = 1;
            while (!this._isAtEnd() && parenCount > 0) {
                const t = this._advance();
                if (t.value === '(') parenCount++;
                else if (t.value === ')') { parenCount--; if (parenCount === 0) break; }
                args.push(t);
            }

            // Strip format specifiers from the first string arg
            if (args.length > 0 && args[0].type === TokenType.STRING_LITERAL) {
                args[0] = { ...args[0], value: this._stripFormatSpecifiers(args[0].value) };
            }

            let first = true;
            for (const arg of args) {
                if (arg.value === ',') {
                    output.push({ type: TokenType.WHITESPACE, value: ' ' });
                    output.push({ type: TokenType.SYMBOL,    value: '<<' });
                    output.push({ type: TokenType.WHITESPACE, value: ' ' });
                } else {
                    if (first) {
                        output.push({ type: TokenType.WHITESPACE, value: ' ' });
                        output.push({ type: TokenType.SYMBOL,    value: '<<' });
                        output.push({ type: TokenType.WHITESPACE, value: ' ' });
                        first = false;
                    }
                    output.push(arg);
                }
            }
        }
    }

    _stripFormatSpecifiers(str) {
        return str.replace(/%[dscf]/g, '');
    }

    _transformScanf(output) {
        this._advance(); // consume 'scanf'
        this.appliedRules.scanf++;

        while (!this._isAtEnd() && this._peek().value !== '(') output.push(this._advance());

        if (this._match(TokenType.SYMBOL, '(')) {
            output.push({ type: TokenType.IDENTIFIER, value: 'cin' });

            const args = [];
            let parenCount = 1;
            while (!this._isAtEnd() && parenCount > 0) {
                const t = this._advance();
                if (t.value === '(') parenCount++;
                else if (t.value === ')') { parenCount--; if (parenCount === 0) break; }
                args.push(t);
            }

            let firstArg = true;
            for (let i = 0; i < args.length; i++) {
                if (args[i].type === TokenType.STRING_LITERAL && firstArg) { firstArg = false; continue; }
                if (args[i].value === ',') {
                    if (!firstArg) {
                        output.push({ type: TokenType.WHITESPACE, value: ' ' });
                        output.push({ type: TokenType.SYMBOL,    value: '>>' });
                        output.push({ type: TokenType.WHITESPACE, value: ' ' });
                    }
                    firstArg = false;
                } else if (args[i].value === '&') {
                    // remove address-of operator
                    continue;
                } else {
                    output.push(args[i]);
                }
            }
        }
    }

    _transformMalloc(output) {
        this._advance(); // consume 'malloc'
        this.appliedRules.malloc++;

        while (!this._isAtEnd() && this._peek().value !== '(') output.push(this._advance());

        if (this._match(TokenType.SYMBOL, '(')) {
            output.push({ type: TokenType.KEYWORD, value: 'new' });
            output.push({ type: TokenType.WHITESPACE, value: ' ' });
            output.push({ type: TokenType.KEYWORD, value: 'char' });
            output.push({ type: TokenType.SYMBOL,  value: '[' });

            let parenCount = 1;
            while (!this._isAtEnd() && parenCount > 0) {
                const t = this._advance();
                if (t.value === '(') parenCount++;
                else if (t.value === ')') {
                    parenCount--;
                    if (parenCount === 0) { output.push({ type: TokenType.SYMBOL, value: ']' }); break; }
                }
                output.push(t);
            }
        } else {
            output.push({ type: TokenType.KEYWORD, value: 'new' });
        }
    }

    _transformFree(output) {
        this._advance(); // consume 'free'
        this.appliedRules.free++;
        output.push({ type: TokenType.KEYWORD, value: 'delete' });
    }

    _transformStruct(output) {
        this._advance(); // consume 'struct'
        output.push({ type: TokenType.KEYWORD, value: 'class' });

        // Look ahead to see if this is a struct definition (has '{')
        let i = 1;
        let isDefinition = false;
        while (true) {
            const n = this._peek(i);
            if (n.type === TokenType.END_OF_FILE || n.value === ';') break;
            if (n.value === '{') { isDefinition = true; break; }
            i++;
        }

        if (isDefinition) {
            while (!this._isAtEnd()) {
                const t = this._advance();
                output.push(t);
                if (t.value === '{') {
                    output.push({ type: TokenType.WHITESPACE, value: '\npublic:' });
                    this.appliedRules.struct++;
                    break;
                }
            }
        }
    }
}

// ─── CodeGenerator ─────────────────────────────────────────────
class CodeGenerator {
    generate(tokens) {
        return tokens
            .filter(t => t.type !== TokenType.END_OF_FILE)
            .map(t => t.value)
            .join('');
    }
}

// ─── Simple syntax highlighter for output display ──────────────
function syntaxHighlightCpp(code) {
    const CPP_KEYWORDS = new Set([
        'alignas','alignof','and','and_eq','asm','auto','bitand','bitor','bool',
        'break','case','catch','char','char16_t','char32_t','class','compl','const',
        'constexpr','const_cast','continue','decltype','default','delete','do','double',
        'dynamic_cast','else','enum','explicit','export','extern','false','float','for',
        'friend','goto','if','inline','int','long','mutable','namespace','new','noexcept',
        'not','not_eq','nullptr','operator','or','or_eq','private','protected','public',
        'register','reinterpret_cast','return','short','signed','sizeof','static',
        'static_assert','static_cast','struct','switch','template','this','thread_local',
        'throw','true','try','typedef','typeid','typename','union','unsigned','using',
        'virtual','void','volatile','wchar_t','while','xor','xor_eq','cout','cin','endl',
    ]);

    const lines = code.split('\n');
    return lines.map(line => {
        // Preprocessor lines
        if (/^\s*#/.test(line)) {
            return `<span class="hl-preprocess">${escHtml(line)}</span>`;
        }
        // Comments
        if (/^\s*\/\//.test(line)) {
            return `<span class="hl-comment">${escHtml(line)}</span>`;
        }

        // Token-by-token highlight
        let result = '';
        let i = 0;
        while (i < line.length) {
            // String literal
            if (line[i] === '"' || line[i] === "'") {
                const q = line[i];
                let s = q; i++;
                while (i < line.length && line[i] !== q) {
                    if (line[i] === '\\' && i+1 < line.length) { s += line[i] + line[i+1]; i += 2; }
                    else { s += line[i++]; }
                }
                s += (i < line.length ? line[i++] : '');
                result += `<span class="hl-string">${escHtml(s)}</span>`;
                continue;
            }
            // Number
            if (/[0-9]/.test(line[i])) {
                let s = '';
                while (i < line.length && /[0-9a-fA-FxX.]/.test(line[i])) s += line[i++];
                result += `<span class="hl-number">${escHtml(s)}</span>`;
                continue;
            }
            // Identifier or keyword
            if (/[a-zA-Z_]/.test(line[i])) {
                let s = '';
                while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) s += line[i++];
                if (CPP_KEYWORDS.has(s)) {
                    result += `<span class="hl-keyword">${escHtml(s)}</span>`;
                } else {
                    result += `<span class="hl-identifier">${escHtml(s)}</span>`;
                }
                continue;
            }
            // Operator/symbol clusters
            if (/[+\-*/<>=!&|^~%?:;,.()\[\]{}]/.test(line[i])) {
                let s = line[i++];
                // grab multi-char ops
                while (i < line.length && /[+\-*/<>=!&|^~%]/.test(line[i]) && s.length < 3) {
                    s += line[i++];
                }
                result += `<span class="hl-symbol">${escHtml(s)}</span>`;
                continue;
            }
            // Whitespace
            result += escHtml(line[i++]);
        }
        return result;
    }).join('\n');
}

function escHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─── C Syntax Error Checker ─────────────────────────────────────
function checkCSourceErrors(source) {
    const errors = [];
    const lines = source.split('\n');
    
    // Bracket balancing stack
    const stack = [];
    const openChars = ['(', '[', '{'];
    const closeChars = [')', ']', '}'];
    const matchMap = { ')': '(', ']': '[', '}': '{' };
    
    let inBlockComment = false;
    let inString = false;
    let stringChar = '';
    
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx].replace(/\r/g, '');
        let i = 0;
        
        while (i < line.length) {
            // Handle comments and string literals to avoid counting braces inside them
            if (inBlockComment) {
                if (line[i] === '*' && line[i+1] === '/') {
                    inBlockComment = false;
                    i += 2;
                    continue;
                }
                i++;
                continue;
            }
            
            if (inString) {
                if (line[i] === '\\' && i + 1 < line.length) {
                    i += 2;
                    continue;
                }
                if (line[i] === stringChar) {
                    inString = false;
                }
                i++;
                continue;
            }
            
            // Check for block comment starts
            if (line[i] === '/' && line[i+1] === '*') {
                inBlockComment = true;
                i += 2;
                continue;
            }
            // Check for single line comments
            if (line[i] === '/' && line[i+1] === '/') {
                break; // Skip the rest of this line
            }
            
            // Check for string starts
            if (line[i] === '"' || line[i] === "'") {
                inString = true;
                stringChar = line[i];
                i++;
                continue;
            }
            
            // Bracket matching
            if (openChars.includes(line[i])) {
                stack.push({ char: line[i], line: lineIdx + 1 });
            } else if (closeChars.includes(line[i])) {
                if (stack.length === 0) {
                    errors.push({
                        line: lineIdx + 1,
                        message: `Unmatched closing '${line[i]}'`,
                        severity: 'error'
                    });
                } else {
                    const top = stack.pop();
                    if (top.char !== matchMap[line[i]]) {
                        errors.push({
                            line: lineIdx + 1,
                            message: `Mismatched closing '${line[i]}' (expected matching '${matchMap[line[i]]}' for '${top.char}' on line ${top.line})`,
                            severity: 'error'
                        });
                    }
                }
            }
            i++;
        }
        
        // At the end of the line, if the string is still open and not multiline-escaped
        if (inString && !line.endsWith('\\')) {
            errors.push({
                line: lineIdx + 1,
                message: `Unterminated string literal`,
                severity: 'error'
            });
            inString = false; // Reset to avoid cascading errors on next lines
        }
    }
    
    // Check for unclosed block comment
    if (inBlockComment) {
        errors.push({
            line: lines.length,
            message: `Unterminated block comment (/*)`,
            severity: 'error'
        });
    }
    
    // Check for remaining open brackets
    while (stack.length > 0) {
        const unclosed = stack.pop();
        errors.push({
            line: unclosed.line,
            message: `Unclosed opening '${unclosed.char}'`,
            severity: 'error'
        });
    }
    
    return errors;
}

// ─── Main compile function ─────────────────────────────────────
function compile(source) {
    try {
        // Phase 1: Lex
        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();

        // Phase 2: Transform
        const transformer = new Transformer(tokens);
        const transformedTokens = transformer.transform();
        const appliedRules = transformer.appliedRules;

        // Phase 3: Generate
        const generator = new CodeGenerator();
        const output = generator.generate(transformedTokens);

        // Also return visible tokens (non-whitespace) for the token panel
        const visibleTokens = tokens.filter(t =>
            t.type !== TokenType.WHITESPACE && t.type !== TokenType.END_OF_FILE
        );

        // Check for local syntax errors
        const syntaxErrors = checkCSourceErrors(source);

        return {
            success: true,
            output,
            tokens: visibleTokens,
            allTokens: tokens,
            appliedRules,
            syntaxErrors,
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
