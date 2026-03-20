#ifndef COMPILER_H
#define COMPILER_H

#include <string>

enum class TokenType {
    KEYWORD,
    IDENTIFIER,
    STRING_LITERAL,
    NUMBER,
    SYMBOL,
    PREPROCESSOR,
    WHITESPACE,
    COMMENT,
    UNKNOWN,
    END_OF_FILE
};

struct Token {
    TokenType type;
    std::string value;
};

#endif // COMPILER_H
