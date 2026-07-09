import "package:flutter/material.dart";

import "screens/home_screen.dart";
import "services/api_client.dart";

void main() {
  runApp(const GrandmaApp());
}

class GrandmaApp extends StatelessWidget {
  const GrandmaApp({super.key});

  @override
  Widget build(BuildContext context) {
    const appApiToken = String.fromEnvironment("APP_API_TOKEN");
    final apiClient = ApiClient(
      baseUrl: const String.fromEnvironment(
        "API_BASE_URL",
        defaultValue: "http://10.0.2.2:3000",
      ),
      appApiToken: appApiToken.isEmpty ? null : appApiToken,
    );

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: "Grandma Voice",
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFE76F51),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFFFF8EE),
        useMaterial3: true,
      ),
      home: HomeScreen(apiClient: apiClient),
    );
  }
}
