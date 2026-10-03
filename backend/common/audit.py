from accounts.models import AuditEvent


def audit(actor, action, obj, **metadata):
    AuditEvent.objects.create(
        actor=actor,
        action=action,
        object_type=obj._meta.label,
        object_id=str(obj.pk),
        metadata=metadata,
    )
