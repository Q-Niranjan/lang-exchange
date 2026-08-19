package auth

import (
	"crypto/rand"
	"fmt"
	"math/big"
)

// Reddit-style adjective + noun usernames (letters only, no digits).
var usernameAdjectives = []string{
	"Silent", "Clever", "Happy", "Quiet", "Swift", "Bold", "Calm", "Brave",
	"Witty", "Noble", "Keen", "Lucky", "Merry", "Sunny", "Cosmic", "Mystic",
	"Golden", "Gentle", "Fierce", "Humble", "Curious", "Daring", "Cosy", "Frosty",
	"Misty", "Sleepy", "Snappy", "Zesty", "Fluffy", "Grumpy", "Jolly", "Rusty",
	"Ancient", "Hidden", "Wandering", "Playful", "Steady", "Vivid", "Wild", "Kind",
}

var usernameNouns = []string{
	"Otter", "Panda", "Falcon", "Badger", "Walrus", "Phoenix", "Tiger", "Eagle",
	"Wolf", "Bear", "Fox", "Lynx", "Heron", "Koala", "Rabbit", "Turtle",
	"Beaver", "Finch", "Bison", "Moose", "Raven", "Crane", "Parrot", "Puffin",
	"Quokka", "Sloth", "Llama", "Orca", "Peacock", "Squirrel", "Gecko", "Condor",
	"Cobra", "Dolphin", "Hamster", "Jaguar", "Magpie", "Narwhal", "Osprey",
}

func randomUsername() (string, error) {
	adj, err := pickWord(usernameAdjectives)
	if err != nil {
		return "", err
	}
	noun, err := pickWord(usernameNouns)
	if err != nil {
		return "", err
	}
	return adj + noun, nil
}

func pickWord(words []string) (string, error) {
	if len(words) == 0 {
		return "", fmt.Errorf("empty word list")
	}
	n, err := rand.Int(rand.Reader, big.NewInt(int64(len(words))))
	if err != nil {
		return "", err
	}
	return words[n.Int64()], nil
}
