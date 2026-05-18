import os
import pickle
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

def generate_mock_dataset():
    """
    Generates a synthetic historical student training set 
    simulating academic performance distributions.
    """
    import random
    random.seed(42)
    
    data = []
    for _ in range(1000):
        marks = random.randint(30, 100)
        attendance = random.randint(40, 100)
        assignments = random.randint(30, 100)
        
        # Define complex heuristic logic boundary curves for training targets
        score = (marks * 0.5) + (attendance * 0.3) + (assignments * 0.2)
        
        if score < 55 or attendance < 65:
            risk = "High"
        elif score < 72 or attendance < 75:
            risk = "Medium"
        else:
            risk = "Low"
            
        data.append([marks, attendance, assignments, risk])
        
    return pd.DataFrame(data, columns=['internal_marks', 'attendance', 'assignment_score', 'risk_level'])

def train_and_export_pipeline():
    print("Initializing synthetic historical student data compilation...")
    df = generate_mock_dataset()
    
    # Split features and target labels
    X = df[['internal_marks', 'attendance', 'assignment_score']]
    y = df['risk_level']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("Training robust Random Forest Classifier model context...")
    # Initialize a Random Forest model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate model accuracy metrics
    predictions = model.predict(X_test)
    print("\n--- Model Training Performance Evaluation ---")
    print(classification_report(y_test, predictions))
    
    # Export trained binary classifier using pickle serialization protocols
    model_path = os.path.join(os.path.dirname(__file__), 'risk_classifier.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
        
    print(f"✓ Machine learning binary safely exported asset path: {model_path}\n")

if __name__ == '__main__':
    train_and_export_pipeline()