import "package:flutter_test/flutter_test.dart";
import "package:grandma_app/main.dart";

void main() {
  testWidgets("App renders home title", (WidgetTester tester) async {
    await tester.pumpWidget(const GrandmaApp());
    expect(find.text("Η οικογένειά μου"), findsOneWidget);
  });
}

