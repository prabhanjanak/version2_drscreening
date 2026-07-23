import 'package:flutter_test/flutter_test.dart';
import 'package:netrartha_mobile/main.dart';

void main() {
  testWidgets('Netrartha Mobile App Smoke Test', (WidgetTester tester) async {
    await tester.pumpWidget(const NetrarthaMobileApp());
    expect(find.text('Netrartha v1'), findsOneWidget);
  });
}
