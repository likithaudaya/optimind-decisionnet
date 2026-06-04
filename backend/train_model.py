import os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

def generate_synthetic_student_data(num_records=1000):
    """Generates an authentic training dataset tracking student profiles."""
    np.random.seed(42)
    
    # Feature 1: Internal Marks (Percentage out of 100)
    internal_marks = np.random.randint(30, 100, size=num_records)
    
    # Feature 2: Attendance Percentage (Out of 100)
    attendance = np.random.randint(45, 100, size=num_records)
    
    # Feature 3: Assignment Completion Rate (Scale 0 to 10)
    assignments_completed = np.random.randint(2, 11, size=num_records)
    
    data = pd.DataFrame({
        'internal_marks': internal_marks,
        'attendance': attendance,
        'assignments_completed': assignments_completed
    })
    
    # Define Ground-Truth Rules for Risk Mapping:
    # 0 = Low Risk (Excellent standing)
    # 1 = Medium Risk (Borderline warning)
    # 2 = High Risk (Critical intervention required)
    risk_labels = []
    for idx, row in data.iterrows():
        # High Risk Conditions (Low attendance or critically failing internals)
        if row['attendance'] < 75 or row['internal_marks'] < 40 or row['assignments_completed'] <= 4:
            risk_labels.append(2) 
        # Medium Risk Conditions (Passing but lagging in multiple metrics)
        elif row['attendance'] < 85 or row['internal_marks'] < 60 or row['assignments_completed'] <= 6:
            risk_labels.append(1)
        # Low Risk
        else:
            risk_labels.append(0)
            
    data['risk_level'] = risk_labels
    return data

def train_academic_risk_engine():
    print("📊 Generating training data vector arrays...")
    df = generate_synthetic_student_data(1200)
    
    # Split features and labels
    X = df[['internal_marks', 'attendance', 'assignments_completed']]
    y = df['risk_level']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("🤖 Training Random Forest Classifier matrix...")
    # Initialize model with optimal tree counts for high runtime efficiency
    model = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
    model.fit(X_train, y_train)
    
    # Validate accuracy
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    print(f"✅ Model Training Complete! Validation Accuracy: {accuracy * 100:.2f}%")
    
    # Create models folder inside backend if missing
    os.makedirs('models', exist_ok=True)
    
    # Save the trained model binary using pickle format
    model_export_path = os.path.join('models', 'academic_risk_model.pkl')
    with open(model_export_path, 'wb') as file:
        pickle.dump(model, file)
    print(f"💾 Trained core weights exported safely to: {model_export_path}")

if __name__ == '__main__':
    train_academic_risk_engine()