export const testUsers = {
  alice: {
    email: 'alice@example.com',
    password: 'AlicePass123!',
    name: 'Alice Johnson',
  },
  bob: {
    email: 'bob@example.com',
    password: 'BobPass123!',
    name: 'Bob Smith',
  },
  admin: {
    email: 'admin@example.com',
    password: 'AdminPass123!',
    name: 'Admin User',
    role: 'admin',
  },
};

export const invalidUsers = {
  noEmail: {
    password: 'Pass123!',
    name: 'No Email',
  },
  invalidEmail: {
    email: 'not-an-email',
    password: 'Pass123!',
    name: 'Invalid Email',
  },
  weakPassword: {
    email: 'weak@example.com',
    password: '123',
    name: 'Weak Password',
  },
  noName: {
    email: 'noname@example.com',
    password: 'Pass123!',
  },
};