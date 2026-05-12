namespace Api.Logic;

public record AccessRequestSla(
    string Stage,
    string Policy,
    int SlaHours,
    string DueAt,
    int ElapsedMinutes,
    string Outcome,
    bool Breached);