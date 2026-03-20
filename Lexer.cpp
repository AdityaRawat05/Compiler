#include "Lexer.h"
#include <cctype>
#include <unordered_set>

Lexer::Lexer(const std::string& source) : source(source), pos(0) {}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;

    while (!isAtEnd()) {
        char c = peek();

        if (std::isspace(c)) {
            tokens.push_back(consumeWhitespace());
        } else if (c == '/' && (peekNext() == '/' || peekNext() == '*')) {
            tokens.push_back(consumeComment());
        } else if (c == '#') {
            tokens.push_back(consumePreprocessor());
        } else if (c == '"' || c == '\'') {
            tokens.push_back(consumeString());
        } else if (std::isdigit(c)) {
            tokens.push_back(consumeNumber());
        } else if (std::isalpha(c) || c == '_') {
            tokens.push_back(consumeIdentifierOrKeyword());
        } else {
            tokens.push_back(consumeSymbol());
        }
    }

    tokens.push_back({TokenType::END_OF_FILE, ""});
    return tokens;
}

char Lexer::peek() const {
    if (isAtEnd()) return '\0';
    return source[pos];
}

char Lexer::peekNext() const {
    if (pos + 1 >= source.length()) return '\0';
    return source[pos + 1];
}

char Lexer::advance() {
    if (isAtEnd()) return '\0';
    return source[pos++];
}

bool Lexer::isAtEnd() const {
    return pos >= source.length();
}

Token Lexer::consumeWhitespace() {
    std::string val;
    while (!isAtEnd() && std::isspace(peek())) {
        val += advance();
    }
    return {TokenType::WHITESPACE, val};
}

Token Lexer::consumeComment() {
    std::string val;
    if (peek() == '/' && peekNext() == '/') {
        val += advance(); // '/'
        val += advance(); // '/'
        while (!isAtEnd() && peek() != '\n') {
            val += advance();
        }
    } else if (peek() == '/' && peekNext() == '*') {
        val += advance(); // '/'
        val += advance(); // '*'
        while (!isAtEnd()) {
            if (peek() == '*' && peekNext() == '/') {
                val += advance(); // '*'
                val += advance(); // '/'
                break;
            }
            val += advance();
        }
    }
    return {TokenType::COMMENT, val};
}

Token Lexer::consumeString() {
    std::string val;
    char quote = advance(); 
    val += quote;
    while (!isAtEnd() && peek() != quote) {
        if (peek() == '\\') {
            val += advance();
            if (!isAtEnd()) {
                val += advance();
            }
        } else {
            val += advance();
        }
    }
    if (!isAtEnd()) {
        val += advance();
    }
    return {TokenType::STRING_LITERAL, val};
}

Token Lexer::consumeNumber() {
    std::string val;
    while (!isAtEnd() && (std::isalnum(peek()) || peek() == '.')) {
        val += advance();
    }
    return {TokenType::NUMBER, val};
}

Token Lexer::consumeIdentifierOrKeyword() {
    std::string val;
    while (!isAtEnd() && (std::isalnum(peek()) || peek() == '_')) {
        val += advance();
    }
    
    if (isKeyword(val)) {
        return {TokenType::KEYWORD, val};
    }
    return {TokenType::IDENTIFIER, val};
}

Token Lexer::consumePreprocessor() {
    std::string val;
    while (!isAtEnd() && peek() != '\n') {
        if (peek() == '\\') {
            val += advance();
            if (!isAtEnd()) val += advance();
        } else {
            val += advance();
        }
    }
    return {TokenType::PREPROCESSOR, val};
}

Token Lexer::consumeSymbol() {
    std::string val;
    char c = advance();
    val += c;
    
    char next = peek();
    if ((c == '=' && next == '=') ||
        (c == '!' && next == '=') ||
        (c == '<' && next == '=') ||
        (c == '>' && next == '=') ||
        (c == '&' && next == '&') ||
        (c == '|' && next == '|') ||
        (c == '-' && next == '>') ||
        (c == '+' && next == '+') ||
        (c == '-' && next == '-') ||
        (c == '+' && next == '=') ||
        (c == '-' && next == '=') ||
        (c == '*' && next == '=') ||
        (c == '/' && next == '=') ||
        (c == ':' && next == ':')) {
        val += advance();
    }
    
    return {TokenType::SYMBOL, val};
}

bool Lexer::isKeyword(const std::string& str) const {
    static const std::unordered_set<std::string> keywords = {
        "auto", "break", "case", "char", "const", "continue", "default", "do",
        "double", "else", "enum", "extern", "float", "for", "goto", "if",
        "int", "long", "register", "return", "short", "signed", "sizeof", "static",
        "struct", "switch", "typedef", "union", "unsigned", "void", "volatile", "while"
    };
    return keywords.find(str) != keywords.end();
}
