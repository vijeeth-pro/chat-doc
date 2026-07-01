import os
import json
from flask_cors import CORS
from flask import Flask, request, jsonify
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings, StorageContext, load_index_from_storage

from llama_index.llms.google_genai import GoogleGenAI
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding


from dotenv import load_dotenv
load_dotenv()


Settings.llm = GoogleGenAI(
    model="gemini-2.5-flash",
    api_key=os.environ['GOOGLE_API_KEY'],
)

Settings.embed_model = GoogleGenAIEmbedding(
    model_name="models/gemini-embedding-001",
    api_key=os.environ['GOOGLE_API_KEY'],
)

app = Flask(__name__)
CORS(app)


@app.route('/', methods = ['GET'])
def index():
    try:
        return create_llama_index()
    except Exception as e:
        return jsonify({"error": "LlamaIndex creation failed", "message": str(e)}), 500



def create_llama_index():
    try:
        index_dir = 'index'
        os.makedirs(index_dir, exist_ok=True)
        
        # Ensure uploads folder exists
        os.makedirs('uploads', exist_ok=True)
        if not os.listdir('uploads'):
            return jsonify({"message": "Upload directory is empty. Ready for files."}), 200
            
        documents = SimpleDirectoryReader('uploads').load_data()
        index = VectorStoreIndex.from_documents(documents)
        index.storage_context.persist(persist_dir=index_dir)
        
        if not os.path.exists(index_dir) or not os.listdir(index_dir):
            raise Exception("LlamaIndex storage context failed to persist")
        
        return jsonify({"message": "File index success"}), 200 

    except Exception as e:
        raise Exception(f"Error creating LlamaIndex: {str(e)}")


@app.route('/upload', methods=['POST'])
def upload():
    try:
        if 'file' not in request.files:
            return jsonify({"message": "No file"}), 400
            
        file = request.files['file'] 

        if file.filename == '':
            return jsonify({"message": "No file"}), 400

        if file:
            upload_dir = 'uploads'
            os.makedirs(upload_dir, exist_ok=True)
            
            # Delete all existing files in the uploads folder
            for existing_file in os.listdir(upload_dir):
                file_path = os.path.join(upload_dir, existing_file)
                if os.path.isfile(file_path):
                    os.remove(file_path)  # Delete the file
            
            # Now save the new file
            file_path = os.path.join(upload_dir, file.filename)
            file.save(file_path)
            
            # Auto-index the uploaded file immediately so RAG works dynamically
            index_dir = 'index'
            os.makedirs(index_dir, exist_ok=True)
            documents = SimpleDirectoryReader('uploads').load_data()
            index = VectorStoreIndex.from_documents(documents)
            index.storage_context.persist(persist_dir=index_dir)
            
            return jsonify({
                "message": "success", 
                "file_path": file_path, 
                "filename": file.filename
            }), 200

    except Exception as e:
        return jsonify({"error": "Error uploading file", "message": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json or {}
        message = data.get('message')
        if not message:
            return jsonify({"message": "No message provided"}), 400

        index_dir = 'index'
        if not os.path.exists(index_dir) or not os.listdir(index_dir):
            return jsonify({
                "text": "No documents uploaded or indexed yet. Please upload a document first.",
                "sources": []
            }), 200

        # Load the persisted index
        storage_context = StorageContext.from_defaults(persist_dir=index_dir)
        index = load_index_from_storage(storage_context)
        
        query_engine = index.as_query_engine()
        response = query_engine.query(message)
        print('response', response)
        
        # Extract sources from the source nodes
        sources = []
        if hasattr(response, 'source_nodes') and response.source_nodes:
            for node_with_score in response.source_nodes:
                metadata = node_with_score.node.metadata or {}
                file_name = metadata.get('file_name')
                if file_name and not any(s['name'] == file_name for s in sources):
                    sources.append({"id": file_name, "name": file_name})

        import datetime
        return jsonify({
            "text": str(response),
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "sources": sources
        }), 200

    except Exception as e:
        return jsonify({"error": "Error during chat query", "message": str(e)}), 500

@app.route('/api/db-stats', methods=['GET'])
def db_stats():
    try:
        index_dir = 'index'
        vector_store_path = os.path.join(index_dir, 'default__vector_store.json')
        docstore_path = os.path.join(index_dir, 'docstore.json')
        
        if not os.path.exists(vector_store_path) or not os.path.exists(docstore_path):
            return jsonify({
                "initialized": False,
                "node_count": 0,
                "document_count": 0,
                "documents": []
            }), 200
            
        with open(vector_store_path, 'r') as f:
            vector_data = json.load(f)
        with open(docstore_path, 'r') as f:
            doc_data = json.load(f)
            
        embedding_dict = vector_data.get('embedding_dict', {})
        node_count = len(embedding_dict)
        
        docs = doc_data.get('docstore/data', {})
        unique_docs = set()
        for doc_id, doc_info in docs.items():
            data_dict = doc_info.get('__data__', {})
            meta = data_dict.get('metadata', {})
            file_name = meta.get('file_name')
            if file_name:
                unique_docs.add(file_name)
                
        return jsonify({
            "initialized": True,
            "node_count": node_count,
            "document_count": len(unique_docs),
            "documents": list(unique_docs)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/db-nodes', methods=['GET'])
def db_nodes():
    try:
        index_dir = 'index'
        docstore_path = os.path.join(index_dir, 'docstore.json')
        
        if not os.path.exists(docstore_path):
            return jsonify([]), 200
            
        with open(docstore_path, 'r') as f:
            doc_data = json.load(f)
            
        docs = doc_data.get('docstore/data', {})
        nodes = []
        for doc_id, doc_info in docs.items():
            data_dict = doc_info.get('__data__', {})
            text = data_dict.get('text', '')
            if text:
                meta = data_dict.get('metadata', {})
                nodes.append({
                    "id": doc_id,
                    "text": text[:500] + "..." if len(text) > 500 else text,
                    "full_text": text,
                    "file_name": meta.get('file_name', 'Unknown'),
                    "file_size": meta.get('file_size'),
                    "file_type": meta.get('file_type'),
                    "page_number": meta.get('page_label')
                })
                
        return jsonify(nodes), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    
if __name__ == '__main__':
    app.run(debug=True, host="127.0.0.1", port=5001)