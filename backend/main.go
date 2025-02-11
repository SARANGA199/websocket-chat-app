package main

import (
	"chatapp/wsmanager"
	"context"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var client *mongo.Client
var collection *mongo.Collection
var mu sync.Mutex
var clients = make(map[string][]*websocket.Conn)

type Message struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	MpID        string             `bson:"mp_id" json:"mp_id"`
	MID         string             `bson:"m_id" json:"m_id"`
	Content     string             `bson:"content" json:"content"`
	SenderID    string             `bson:"senderId" json:"senderId"`
	Status      int                `bson:"status" json:"status"`
	Inbound     bool               `bson:"inbound" json:"inbound"`
	IsUnread    bool               `bson:"is_unread" json:"is_unread"`
	CreatedAt   primitive.DateTime `bson:"created_at" json:"created_at"`
	DeliveredAt primitive.DateTime `bson:"delivered_at" json:"delivered_at"`
	ReadAt      primitive.DateTime `bson:"read_at" json:"read_at"`
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error upgrading WebSocket:", err)
		return
	}
	defer conn.Close()

	userID := r.URL.Query().Get("userId")
	if userID == "" {
		log.Println("No userId provided")
		return
	}

	// Add connection to WebSocket manager
	wsmanager.Manager.AddConnection(userID, conn)

	// Listen for incoming messages
	for {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Println("Error reading message:", err)
			wsmanager.Manager.RemoveConnection(userID, conn)
			break
		}

		eventType := msg["type"].(string)
		log.Println("Received message:", msg)

		switch eventType {
		case "message":
			handleMessage(msg)
		case "read_receipt":
			log.Println("Handling read receipt")
		}
	}
}

func removeConnection(userID string, conn *websocket.Conn) {
	mu.Lock()
	defer mu.Unlock()

	connections, exists := clients[userID]
	if !exists {
		return
	}

	for i, c := range connections {
		if c == conn {
			clients[userID] = append(connections[:i], connections[i+1:]...)
			break
		}
	}

	if len(clients[userID]) == 0 {
		delete(clients, userID)
	}
}

func handleMessage(msg map[string]interface{}) {
	senderId := msg["senderId"].(string)
	receiverId := msg["receiverId"].(string)
	content := msg["content"].(string)

	id := primitive.NewObjectID()
	newMessage := Message{
		ID:          id,
		SenderID:    senderId,
		MpID:        receiverId,
		MID:         fmt.Sprintf("%s_%s", id.Hex(), senderId),
		Content:     content,
		Status:      1,
		Inbound:     false,
		IsUnread:    true,
		CreatedAt:   primitive.NewDateTimeFromTime(time.Now()),
		DeliveredAt: primitive.NewDateTimeFromTime(time.Now()),
		ReadAt:      primitive.NewDateTimeFromTime(time.Now()),
	}

	_, err := collection.InsertOne(context.TODO(), newMessage)
	if err != nil {
		log.Println("Error saving message:", err)
		return
	}

	// broadcastMessage(receiverId, newMessage)
	// broadcastMessage(senderId, newMessage)
	// Send message to all receiver connections
	wsmanager.Manager.BroadcastMessage(receiverId, msg)
	// Send message to all sender connections (for real-time UI updates)
	wsmanager.Manager.BroadcastMessage(senderId, msg)
}

// Start WebSocket server
func main() {
	var err error
	clientOptions := options.Client().ApplyURI("mongodb://falkonSMS-teams-notifications-dev-db-usr:3gxj6wz5YoMp@131.153.203.245:49156,131.153.11.99:49156/falkonsms-teams-notifications-dev-db?replicaSet=falkonSystems")
	client, err = mongo.Connect(context.TODO(), clientOptions)
	if err != nil {
		log.Fatal(err)
	}
	collection = client.Database("falkonsms-teams-notifications-dev-db").Collection("secureMessages")

	http.HandleFunc("/ws", handleConnections)
	log.Println("WebSocket server started on ws://localhost:8080/ws")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
