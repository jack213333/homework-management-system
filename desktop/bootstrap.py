"""Initialize fictional content once, while respecting existing user databases."""

from desktop.paths import RuntimePaths


def initialize_demo(paths: RuntimePaths, *, new_database: bool = False) -> None:
    marker = paths.data_root / "demo-initialized.json"
    if marker.exists() and not new_database:
        return

    from django.core.management import call_command
    from django.db import transaction
    from accounts.models import User

    # An older installation may have no marker. Its existing business data
    # takes precedence over sample content; never restore deleted relationships.
    with transaction.atomic():
        if not User.objects.exists():
            call_command("seed_demo", verbosity=0)
            call_command("load_demo_work", verbosity=0)
    marker.write_text('{"version": 1}\n', encoding="utf-8")
