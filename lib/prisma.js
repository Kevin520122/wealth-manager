import { PrismaClient } from './generated/prisma/client'

// export const db = globalThis.prisma || new PrismaClient()

// if(process.env.NODE_ENV !== 'production') {
//     globalThis.prisma = db;
// }

let prisma

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  // In development, create a new instance only if one doesn't exist
  if (!global.prisma) {
    global.prisma = new PrismaClient()
  }
  prisma = global.prisma
}

export const db = prisma