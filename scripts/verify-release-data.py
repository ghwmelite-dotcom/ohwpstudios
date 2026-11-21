"""Compare private D1 exports without logging record values or credentials."""
import hashlib
import json
import pathlib
import sqlite3
import sys


def database(path):
    connection = sqlite3.connect(':memory:')
    # Preserve literal CR/LF characters inside SQL text values during comparison.
    with pathlib.Path(path).open(encoding='utf-8', newline='') as source:
        connection.executescript(source.read())
    return connection


def identifier(value):
    return '"' + value.replace('"', '""') + '"'


def rows(connection, table, columns):
    query = 'SELECT ' + ','.join(map(identifier, columns)) + ' FROM ' + identifier(table)
    return sorted(json.dumps(row, ensure_ascii=False, default=str) for row in connection.execute(query))


before = database(sys.argv[1])
if sys.argv[2] == '--rehearse':
    after = database(sys.argv[1])
    # Confirm the reviewed rebuild neither drops unknown columns nor affects dependents.
    columns = [row[1] for row in before.execute('PRAGMA table_info(project_estimates)')]
    expected = 'id name email company phone project_description project_type timeline_preference budget_range ai_analysis estimated_cost_min estimated_cost_max estimated_timeline_weeks technology_stack team_size_needed risk_level status admin_notes created_at updated_at share_token website_url'.split()
    assert columns == expected, 'Production estimator schema changed; review migration before proceeding'
    schema = before.execute("SELECT type,name,sql FROM sqlite_master WHERE type IN ('table','trigger','view')").fetchall()
    for kind, name, sql in schema:
        if kind == 'table':
            assert not any(row[2] == 'project_estimates' for row in before.execute('PRAGMA foreign_key_list(' + identifier(name) + ')')), 'Unexpected inbound estimator foreign key'
        else:
            if 'project_estimates' in (sql or '').lower():
                expected_trigger = 'CREATE TRIGGER update_project_estimates_timestamp AFTER UPDATE ON project_estimates BEGIN UPDATE project_estimates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END'
                assert kind == 'trigger' and ' '.join((sql or '').split()).rstrip(';') == expected_trigger, 'Unexpected estimator trigger/view'
    for migration in sys.argv[3:6]:
        after.executescript(pathlib.Path(migration).read_text(encoding='utf-8'))
    output = sys.argv[6]
else:
    after = database(sys.argv[2])
    output = sys.argv[3]

report = {'tables': [], 'missing_records': [], 'lost_indexes': [], 'lost_triggers_or_views': [], 'sequence_regressions': []}
for (table,) in before.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"):
    columns = [row[1] for row in before.execute('PRAGMA table_info(' + identifier(table) + ')')]
    baseline = rows(before, table, columns)
    current = rows(after, table, columns)
    missing = set(baseline).difference(current)
    if missing:
        report['missing_records'].append({'table': table, 'count': len(missing)})
    digest = hashlib.sha256('\n'.join(baseline).encode()).hexdigest()
    report['tables'].append({'table': table, 'before_count': len(baseline), 'after_count': len(current), 'all_original_records_unchanged': not missing, 'before_sha256': digest})
for (name,) in before.execute("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"):
    if not after.execute("SELECT name FROM sqlite_master WHERE type='index' AND name=?", (name,)).fetchone():
        report['lost_indexes'].append(name)
for kind, name in before.execute("SELECT type,name FROM sqlite_master WHERE type IN ('trigger','view')"):
    if not after.execute('SELECT name FROM sqlite_master WHERE type=? AND name=?', (kind, name)).fetchone():
        report['lost_triggers_or_views'].append(name)
for table, seq in before.execute('SELECT name,seq FROM sqlite_sequence'):
    current = after.execute('SELECT seq FROM sqlite_sequence WHERE name=?', (table,)).fetchone()
    if not current or current[0] < seq:
        report['sequence_regressions'].append(table)
before_fks = set(before.execute('PRAGMA foreign_key_check').fetchall())
after_fks = set(after.execute('PRAGMA foreign_key_check').fetchall())
report['new_foreign_key_violations'] = len(after_fks - before_fks)
report['passed'] = not (report['missing_records'] or report['lost_indexes'] or report['lost_triggers_or_views'] or report['sequence_regressions'] or report['new_foreign_key_violations'])
pathlib.Path(output).write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({'passed': report['passed'], 'tables_checked': len(report['tables']), 'missing_or_changed_records': report['missing_records'], 'lost_indexes': report['lost_indexes'], 'lost_triggers_or_views': report['lost_triggers_or_views'], 'sequence_regressions': report['sequence_regressions'], 'new_foreign_key_violations': report['new_foreign_key_violations']}))
sys.exit(0 if report['passed'] else 1)
