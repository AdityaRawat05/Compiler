#ifndef LEXER_H
#define LEXER_H

#include "compiler.h"
#include <string>
#include <vector>

class Lexer {
public:
    Lexer(const std::string& source);
    std::vector<Token> tokenize();

private:
    std::string source;
    size_t pos;

    char peek() const;
    char peekNext() const;
    char advance();
    bool isAtEnd() const;

    Token consumeWhitespace();
    Token consumeComment();
    Token consumeString();
    Token consumeNumber();
    Token consumeIdentifierOrKeyword();
    Token consumePreprocessor();
    Token consumeSymbol();
    
    bool isKeyword(const std::string& str) const;
};

#endif // LEXER_H
