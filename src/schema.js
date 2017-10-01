// Welcome to Launchpad!
// Log in to edit and save pads, run queries in GraphiQL on the right.
// Click "Download" above to get a zip with a standalone Node.js server.
// See docs and examples at https://github.com/apollographql/awesome-launchpad

// graphql-tools combines a schema string with resolvers.
import { makeExecutableSchema } from 'graphql-tools';
import { withFilter, PubSub } from 'graphql-subscriptions';

// Subscriptions
const EVENTS = {
  CHARACTER_KILLED: 'CHARACTER:KILLED'
};

const pubsub = new PubSub();

// Mock Data
const users = [
  { id: 1, first_name: 'Tywin', last_name: 'Lannister', email_address: 'tywin.lannister@casterlyrock.com'},
  { id: 2, first_name: 'Cersei', last_name: 'Lannister', email_address: 'cersei.lannister@casterlyrock.com'},
  { id: 3, first_name: 'Jaime', last_name: 'Lannister', email_address: 'jaime.lannister@casterlyrock.com'},
  { id: 4, first_name: 'Tyrion', last_name: 'Lannister', email_address: 'tyrion.lannister@casterlyrock.com'},
];

// Mock relational data
const friends = [
  { id: 1, friend_id: 2 },
  { id: 1, friend_id: 3 },
  { id: 1, friend_id: 2 },
  { id: 4, friend_id: 3 }
];

// Construct a schema, using GraphQL schema language
const typeDefs = `
  type Query {
		# Users in the **GraphQL of Thrones**
    users(
			# (Array) The user's ID in GraphQL of Thrones
			id: [Int!]
		) : [User!]
  }

  type Mutation {
		# Login to **GraphQL of Thrones**
    login(email: String!, password: String!) : User
    # Kills a character
    kill(user_id: Int!) : String
  }
	
	# The User type
	type User {
		first_name: String
		last_name: String
		friends: [User!]
  }

  type KillResult {
    user_id: Int
  }

  # Real-time subscriptions
  type Subscription {
    # Fires everytime a certain character is killed
    characterKilled(user_id: Int!) : KillResult
  }
`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    users: (root, args, context) => {
      let results = users
      	.filter(user => {
        	return args.id.indexOf(user.id) > -1;
      	})
      	.map(user => {
          let friendIds = friends
          	.filter(friendRecord => {
              return friendRecord.id === user.id;
            })
          	.map(friendRecord => {
              return friendRecord.friend_id;
            });
          
          user.friends = users
            .filter(existingUser => {
            	return friendIds.indexOf(existingUser.id) > -1;
          	});
          
          return user;
        });
      
      return results;
    }
  },
  Mutation: {
    login: (root, args, context) => {
      return users
      	.find(user => {
          user.email_address === args.email;
        });
    },
    kill: (root, args, context) => {
      let user = users
        .find(user => {
          return user.id === args.user_id;
        });
      pubsub.publish(EVENTS.CHARACTER_KILLED, {user_id: user.id});
      return `${user.first_name} ${user.last_name} has been killed. We wish you fortune in the wars to come.`;
    }
  },
  Subscription: {
    characterKilled: {
      subscribe: () => {
        console.log('subscribing...');
        return pubsub.asyncIterator(EVENTS.CHARACTER_KILLED);
      }
    }
  }
};

// Required: Export the GraphQL.js schema object as "schema"
export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Optional: Export a function to get context from the request. It accepts two
// parameters - headers (lowercased http headers) and secrets (secrets defined
// in secrets section). It must return an object (or a promise resolving to it).
export function context(headers, secrets) {
  return {
    headers,
    secrets,
  };
};

// Optional: Export a root value to be passed during execution
// export const rootValue = {};

// Optional: Export a root function, that returns root to be passed
// during execution, accepting headers and secrets. It can return a
// promise. rootFunction takes precedence over rootValue.
// export function rootFunction(headers, secrets) {
//   return {
//     headers,
//     secrets,
//   };
// };
