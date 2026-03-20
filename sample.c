#include <stdio.h>
#include <stdlib.h>

struct Point {
    int x;
    int y;
};

int main() {
    int count;
    printf("Enter number of points: \n");
    scanf("%d", &count);

    struct Point* points = (struct Point*)malloc(sizeof(struct Point) * count);

    for (int i = 0; i < count; i++) {
        points[i].x = i;
        points[i].y = i * 2;
        printf("Point %d: x=%d, y=%d\n", i, points[i].x, points[i].y);
    }

    free(points);
    return 0;
}
