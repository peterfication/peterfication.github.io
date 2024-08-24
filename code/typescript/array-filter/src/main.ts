interface User {
  name: string;
}

const users: (User | null)[] = [null, { name: 'John' }, null, { name: 'Doe' }];

// Typescript is not happy
// The type is still (User | null)[]
const filteredUsers1 = users.filter((user) => user !== null);

// Typescript is happy, but we need the exact type of the things in the array
// The type is User[]
const filteredUsers2 = users.filter((user): user is User => user !== null);

// Typescript is happy and we don't need the type of the things in the array
// The type is User[]
const filteredUsers3 = users.filter((user): user is NonNullable<typeof user> => user !== null);
