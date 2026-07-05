class Contact {
  const Contact({
    required this.id,
    required this.name,
    required this.avatarUrl,
    this.unreadCount = 0,
    this.lastMessageText = "",
    this.lastMessageAt,
  });

  final String id;
  final String name;
  final String avatarUrl;
  final int unreadCount;
  final String lastMessageText;
  final DateTime? lastMessageAt;

  factory Contact.fromJson(Map<String, dynamic> json) {
    return Contact(
      id: json["id"] as String,
      name: json["name"] as String,
      avatarUrl: json["avatarUrl"] as String,
      unreadCount: (json["unreadCount"] as num?)?.toInt() ?? 0,
      lastMessageText: json["lastMessageText"] as String? ?? "",
      lastMessageAt: json["lastMessageAt"] != null
          ? DateTime.tryParse(json["lastMessageAt"] as String)
          : null,
    );
  }
}
