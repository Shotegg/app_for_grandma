class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.contactId,
    required this.direction,
    required this.text,
    required this.audioUrl,
    required this.createdAt,
  });

  final String id;
  final String contactId;
  final String direction;
  final String text;
  final String? audioUrl;
  final DateTime createdAt;

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json["id"] as String,
      contactId: json["contactId"] as String,
      direction: json["direction"] as String,
      text: json["text"] as String? ?? "",
      audioUrl: json["audioUrl"] as String?,
      createdAt: DateTime.parse(json["createdAt"] as String),
    );
  }
}

