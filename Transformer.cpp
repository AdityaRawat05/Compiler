#include "Transformer.h"
#include <iostream>

Transformer::Transformer(const std::vector<Token>& tokens) : tokens(tokens), pos(0) {}

std::vector<Token> Transformer::transform() {
    std::vector<Token> output;

    // Add include iostream at the top as a safe default
    output.push_back({TokenType::PREPROCESSOR, "#include <iostream>\n"});
    output.push_back({TokenType::KEYWORD, "using"});
    output.push_back({TokenType::WHITESPACE, " "});
    output.push_back({TokenType::IDENTIFIER, "namespace"});
    output.push_back({TokenType::WHITESPACE, " "});
    output.push_back({TokenType::IDENTIFIER, "std"});
    output.push_back({TokenType::SYMBOL, ";"});
    output.push_back({TokenType::WHITESPACE, "\n"});

    while (!isAtEnd()) {
        Token t = peek();
        
        if (t.type == TokenType::IDENTIFIER) {
            if (t.value == "printf") {
                transformPrintf(output);
                continue;
            } else if (t.value == "scanf") {
                transformScanf(output);
                continue;
            } else if (t.value == "malloc") {
                transformMalloc(output);
                continue;
            } else if (t.value == "free") {
                transformFree(output);
                continue;
            }
        } else if (t.type == TokenType::KEYWORD && t.value == "struct") {
            transformStruct(output);
            continue;
        } else if (t.type == TokenType::PREPROCESSOR && (t.value.find("<stdio.h>") != std::string::npos || t.value.find("<stdlib.h>") != std::string::npos)) {
            // Remove standard C includes
            advance();
            continue;
        }
        
        output.push_back(advance());
    }

    return output;
}

Token Transformer::peek(int offset) const {
    if (pos + offset >= tokens.size()) return {TokenType::END_OF_FILE, ""};
    return tokens[pos + offset];
}

Token Transformer::advance() {
    if (isAtEnd()) return {TokenType::END_OF_FILE, ""};
    return tokens[pos++];
}

bool Transformer::isAtEnd() const {
    return pos >= tokens.size() || tokens[pos].type == TokenType::END_OF_FILE;
}

bool Transformer::match(TokenType type, const std::string& value) {
    if (peek().type == type && peek().value == value) {
        advance();
        return true;
    }
    return false;
}

void Transformer::skipWhitespace() {
    while (!isAtEnd() && (peek().type == TokenType::WHITESPACE || peek().type == TokenType::COMMENT)) {
        advance();
    }
}

void Transformer::transformPrintf(std::vector<Token>& output) {
    advance(); // consume 'printf'
    
    while(!isAtEnd() && peek().value != "(") {
        output.push_back(advance());
    }
    
    if (match(TokenType::SYMBOL, "(")) {
        output.push_back({TokenType::IDENTIFIER, "cout"});
        
        std::vector<Token> args;
        int parenCount = 1;
        while (!isAtEnd() && parenCount > 0) {
            Token t = advance();
            if (t.value == "(") parenCount++;
            else if (t.value == ")") {
                parenCount--;
                if (parenCount == 0) break;
            }
            args.push_back(t);
        }
        
        // Clean format string out of the first argument
        if (args.size() > 0 && args[0].type == TokenType::STRING_LITERAL) {
            std::string fmt = args[0].value;
            size_t p = 0;
            while ((p = fmt.find("%d", p)) != std::string::npos ||
                   (p = fmt.find("%s", p)) != std::string::npos ||
                   (p = fmt.find("%c", p)) != std::string::npos ||
                   (p = fmt.find("%f", p)) != std::string::npos) {
                fmt.erase(p, 2);
            }
            // Optional: replace \n with \n in the literal (it's already there)
            args[0].value = fmt;
        }
        
        bool first = true;
        for (const auto& arg : args) {
            if (arg.value == ",") {
                output.push_back({TokenType::WHITESPACE, " "});
                output.push_back({TokenType::SYMBOL, "<<"});
                output.push_back({TokenType::WHITESPACE, " "});
            } else {
                if (first) {
                    output.push_back({TokenType::WHITESPACE, " "});
                    output.push_back({TokenType::SYMBOL, "<<"});
                    output.push_back({TokenType::WHITESPACE, " "});
                    first = false;
                }
                output.push_back(arg);
            }
        }
    }
}

void Transformer::transformScanf(std::vector<Token>& output) {
    advance(); // consume 'scanf'
    
    while(!isAtEnd() && peek().value != "(") {
        output.push_back(advance());
    }
    
    if (match(TokenType::SYMBOL, "(")) {
        output.push_back({TokenType::IDENTIFIER, "cin"});
        
        std::vector<Token> args;
        int parenCount = 1;
        while (!isAtEnd() && parenCount > 0) {
            Token t = advance();
            if (t.value == "(") parenCount++;
            else if (t.value == ")") {
                parenCount--;
                if (parenCount == 0) break;
            }
            args.push_back(t);
        }
        
        bool firstArg = true;
        for (size_t i = 0; i < args.size(); ++i) {
            if (args[i].type == TokenType::STRING_LITERAL && firstArg) {
                firstArg = false; // skip the format string
                continue;
            }
            if (args[i].value == ",") {
                if (!firstArg) {
                    output.push_back({TokenType::WHITESPACE, " "});
                    output.push_back({TokenType::SYMBOL, ">>"});
                    output.push_back({TokenType::WHITESPACE, " "});
                }
                firstArg = false;
            } else if (args[i].value == "&") {
                // remove address-of operator
                continue; 
            } else {
                output.push_back(args[i]);
            }
        }
    }
}

void Transformer::transformMalloc(std::vector<Token>& output) {
    advance(); // consume 'malloc'
    
    // We want malloc(size) -> new char[size]
    while(!isAtEnd() && peek().value != "(") {
        output.push_back(advance());
    }
    
    if (match(TokenType::SYMBOL, "(")) {
        output.push_back({TokenType::KEYWORD, "new"});
        output.push_back({TokenType::WHITESPACE, " "});
        output.push_back({TokenType::KEYWORD, "char"});
        output.push_back({TokenType::SYMBOL, "["});
        
        int parenCount = 1;
        while (!isAtEnd() && parenCount > 0) {
            Token t = advance();
            if (t.value == "(") parenCount++;
            else if (t.value == ")") {
                parenCount--;
                if (parenCount == 0) {
                    output.push_back({TokenType::SYMBOL, "]"});
                    break;
                }
            }
            output.push_back(t);
        }
    } else {
        output.push_back({TokenType::KEYWORD, "new"});
    }
}

void Transformer::transformFree(std::vector<Token>& output) {
    advance(); // consume 'free'
    output.push_back({TokenType::KEYWORD, "delete"});
}

void Transformer::transformStruct(std::vector<Token>& output) {
    advance(); // consume 'struct'
    output.push_back({TokenType::KEYWORD, "class"});
    
    int i = 1;
    bool isDefinition = false;
    while (true) {
        Token n = peek(i);
        if (n.type == TokenType::END_OF_FILE || n.value == ";") break;
        if (n.value == "{") {
            isDefinition = true;
            break;
        }
        i++;
    }

    if (isDefinition) {
        while (!isAtEnd()) {
            Token t = advance();
            output.push_back(t);
            if (t.value == "{") {
                output.push_back({TokenType::WHITESPACE, "\npublic:"});
                break;
            }
        }
    }
}
