import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { getStudioCases, getStudioClients } from '../src/lib/public-studio';

test('CMS-backed studio pages expose published records without seed stories or private client fields', async()=>{
  const sqlite=new Database(':memory:');
  try {
    sqlite.exec(readFileSync(new URL('../migrations/006_quiz_leads_and_case_studies.sql',import.meta.url),'utf8'));
    sqlite.exec(`CREATE TABLE clients(id INTEGER PRIMARY KEY,name TEXT,logo_url TEXT,website_url TEXT,industry TEXT,description TEXT,project_type TEXT,is_featured INTEGER,display_order INTEGER,created_at TEXT,status TEXT,project_value TEXT)`);
    sqlite.prepare(`INSERT INTO clients(name,status,is_featured,display_order,project_value) VALUES (?,?,?,?,?)`).run('Published client','active',1,0,'Private commercial value');
    sqlite.prepare(`INSERT INTO clients(name,status,is_featured,display_order) VALUES (?,?,?,?)`).run('Inactive client','inactive',0,0);
    sqlite.prepare(`INSERT INTO case_studies(title,client_name,industry,published,challenge,solution,results,tech_stack,project_duration,team_size,image_url) VALUES (?,?,?,?,?,?,?,'React','2 weeks',1,'/test.svg')`).run('Approved work','Real client','Education',1,'The problem','The implementation','The result');
    sqlite.prepare(`INSERT INTO case_studies(title,client_name,industry,published,challenge,solution,results,tech_stack,project_duration,team_size,image_url) VALUES (?,?,?,?,?,?,?,'React','2 weeks',1,'/test.svg')`).run('Confidential draft','Another client','Education',0,'Private problem','Private implementation','Private result');
    const prepare=(sql:string,values:(string|number)[]=[])=>({
      bind:(...params:(string|number)[])=>prepare(sql,params),
      all:async()=>({results:sqlite.prepare(sql).all(...values)}),
    });
    const db={prepare} as unknown as D1Database;
    const cases=await getStudioCases(db);
    expect(cases.map(item=>item.title)).toEqual(['Approved work']);
    const clients=await getStudioClients(db);
    expect(clients.map(item=>item.name)).toEqual(['Published client']);
    expect(clients[0]).not.toHaveProperty('project_value');
  } finally { sqlite.close(); }
});
