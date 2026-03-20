#include <iostream>
using namespace std;



class Point {
public:
    int x;
    int y;
};

int main() {
    int count;
    cout << "Enter number of points: \n";
    cin >>  count;

    class Point* points = (class Point*)new char[sizeof(struct Point) * count];

    for (int i = 0; i < count; i++) {
        points[i].x = i;
        points[i].y = i * 2;
        cout << "Point : x=, y=\n" <<  i <<  points[i].x <<  points[i].y;
    }

    delete(points);
    return 0;
}
