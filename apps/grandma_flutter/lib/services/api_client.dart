import "dart:convert";

import "package:http/http.dart" as http;

import "../models/chat_message.dart";
import "../models/contact.dart";

class ApiClient {
  ApiClient({required this.baseUrl});

  final String baseUrl;

  Future<List<Contact>> fetchContacts() async {
    final res = await http.get(Uri.parse("$baseUrl/contacts"));
    if (res.statusCode != 200) {
      throw Exception("Failed to load contacts");
    }
    final data = jsonDecode(res.body) as List<dynamic>;
    return data
        .map((item) => Contact.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<ChatMessage>> fetchMessages(String contactId) async {
    final res = await http.get(Uri.parse("$baseUrl/messages/$contactId"));
    if (res.statusCode != 200) {
      throw Exception("Failed to load messages");
    }
    final data = jsonDecode(res.body) as List<dynamic>;
    return data
        .map((item) => ChatMessage.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<void> markContactAsRead(String contactId) async {
    final res = await http.post(Uri.parse("$baseUrl/contacts/$contactId/read"));
    if (res.statusCode != 200) {
      throw Exception("Failed to mark contact as read");
    }
  }

  Future<void> sendAudioMessage({
    required String contactId,
    String transcript = "",
    String? audioFilePath,
  }) async {
    late http.Response res;
    if (audioFilePath != null && audioFilePath.isNotEmpty) {
      final request = http.MultipartRequest(
        "POST",
        Uri.parse("$baseUrl/messages/$contactId/audio"),
      );
      request.fields["transcript"] = transcript;
      request.files.add(
        await http.MultipartFile.fromPath("audio", audioFilePath),
      );
      final streamed = await request.send();
      res = await http.Response.fromStream(streamed);
    } else {
      res = await http.post(
        Uri.parse("$baseUrl/messages/$contactId/audio"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "transcript": transcript,
        }),
      );
    }

    if (res.statusCode != 200) {
      throw Exception("Failed to send message");
    }
  }
}
