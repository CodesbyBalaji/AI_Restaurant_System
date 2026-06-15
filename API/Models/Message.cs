public class Message
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string SenderId { get; set; } = "";

    public string ReceiverId { get; set; } = "";

    public string Content { get; set; } = "";

    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    public DateTime? DeliveredAt { get; set; }

    public DateTime? ReadAt { get; set; }
}