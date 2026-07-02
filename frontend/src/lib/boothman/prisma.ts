import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'prisma/db.json');

function getDb() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error('Database file not found at ' + DB_PATH + '. Please run the generate-db script.');
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveDb(db: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function createMockModel(modelName: string) {
  return {
    findMany: async (args?: any): Promise<any[]> => {
      let db = getDb();
      let data = db[modelName] || [];
      if (args?.where) {
        data = data.filter((item: any) => {
          return Object.keys(args.where).every(key => {
            const val = args.where[key];
            if (val !== null && typeof val === 'object' && 'not' in val) {
              return item[key] !== val.not;
            }
            return item[key] === val;
          });
        });
      }
      
      if (args?.include) {
        data = data.map((item: any) => {
          let newItem = { ...item };
          if (args.include.booth && newItem.boothId) {
            newItem.booth = db.booth.find((b: any) => b.id === newItem.boothId);
          }
          if (args.include.assignee && newItem.assigneeId) {
            newItem.assignee = db.volunteer.find((v: any) => v.id === newItem.assigneeId);
          }
          if (args.include.volunteers && modelName === 'booth') {
            newItem.volunteers = db.volunteer.filter((v: any) => v.assignedBoothId === newItem.id);
          }
          if (args.include.tasks && modelName === 'booth') {
            newItem.tasks = db.task.filter((t: any) => t.boothId === newItem.id);
          }
          return newItem;
        });
      }
      return data;
    },
    findUnique: async (args: any): Promise<any | null> => {
      let db = getDb();
      let data = db[modelName] || [];
      let item = data.find((item: any) => {
        return Object.keys(args.where).every(key => {
          const val = args.where[key];
          if (val !== null && typeof val === 'object' && 'not' in val) {
            return item[key] !== val.not;
          }
          return item[key] === val;
        });
      });
      if (!item) return null;
      
      let newItem = { ...item };
      if (args?.include) {
        if (args.include.booth && newItem.boothId) {
          newItem.booth = db.booth.find((b: any) => b.id === newItem.boothId);
        }
        if (args.include.assignee && newItem.assigneeId) {
          newItem.assignee = db.volunteer.find((v: any) => v.id === newItem.assigneeId);
        }
        if (args.include.volunteers && modelName === 'booth') {
          newItem.volunteers = db.volunteer.filter((v: any) => v.assignedBoothId === newItem.id);
        }
        if (args.include.tasks && modelName === 'booth') {
          newItem.tasks = db.task.filter((t: any) => t.boothId === newItem.id);
        }
      }
      return newItem;
    },
    create: async (args: any) => {
      let db = getDb();
      if (!db[modelName]) db[modelName] = [];
      let newItem = {
        id: Math.max(0, ...db[modelName].map((i: any) => i.id)) + 1,
        ...args.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db[modelName].push(newItem);
      saveDb(db);
      return newItem;
    },
    update: async (args: any) => {
      let db = getDb();
      let data = db[modelName] || [];
      let index = data.findIndex((item: any) => {
        return Object.keys(args.where).every(key => item[key] === args.where[key]);
      });
      if (index === -1) throw new Error('Record not found');
      
      db[modelName][index] = {
        ...db[modelName][index],
        ...args.data,
        updatedAt: new Date().toISOString()
      };
      saveDb(db);
      return db[modelName][index];
    },
    delete: async (args: any) => {
      let db = getDb();
      let data = db[modelName] || [];
      let index = data.findIndex((item: any) => {
        return Object.keys(args.where).every(key => item[key] === args.where[key]);
      });
      if (index === -1) throw new Error('Record not found');
      
      let item = db[modelName][index];
      db[modelName].splice(index, 1);
      saveDb(db);
      return item;
    },
    deleteMany: async () => {
      let db = getDb();
      db[modelName] = [];
      saveDb(db);
      return { count: 0 };
    },
    count: async (args?: any) => {
      let db = getDb();
      let data = db[modelName] || [];
      if (args?.where) {
        data = data.filter((item: any) => {
          return Object.keys(args.where).every(key => {
            const val = args.where[key];
            if (val !== null && typeof val === 'object' && 'not' in val) {
              return item[key] !== val.not;
            }
            return item[key] === val;
          });
        });
      }
      return data.length;
    }
  };
}

class MockPrismaClient {
  admin = createMockModel('admin');
  booth = createMockModel('booth');
  volunteer = createMockModel('volunteer');
  task = createMockModel('task');
  report = createMockModel('report');
  attendance = createMockModel('attendance');
}

const globalForPrisma = global as unknown as { prismaBoothmanInstance: MockPrismaClient }

export const prisma = globalForPrisma.prismaBoothmanInstance || new MockPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaBoothmanInstance = prisma
